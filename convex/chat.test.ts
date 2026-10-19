/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { ConvexError } from 'convex/values'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import presenceTest from '@convex-dev/presence/test'
import rateLimiterTest from '@convex-dev/rate-limiter/test'
import workpoolTest from '@convex-dev/workpool/test'
import { api, internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { deeplRequestBody, languageFromDeepl } from './lib/languages'
import { firstUrl, isSafeUrl, parseMetadata } from './lib/linkPreview'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')
const page = { numItems: 20, cursor: null }

function setup() {
  const t = convexTest(schema, modules)
  presenceTest.register(t, 'presence')
  rateLimiterTest.register(t, 'rateLimiter')
  workpoolTest.register(t, 'translationWorkpool')
  workpoolTest.register(t, 'pushWorkpool')
  return t
}

type Test = ReturnType<typeof setup>

async function signUp(t: Test, name: string, language = 'English') {
  const as = t.withIdentity({ name, subject: name, tokenIdentifier: `test|${name}` })
  const id = await as.mutation(api.users.store, {})
  if (language !== 'English') await as.mutation(api.users.setLanguage, { language })
  const me = await as.query(api.users.me, {})
  return { as, id, pin: me!.pin }
}

async function directChat(t: Test) {
  const alice = await signUp(t, 'Alice')
  const bob = await signUp(t, 'Bob', 'Spanish')
  const conversationId = await alice.as.mutation(api.conversations.startDirect, { pin: bob.pin })
  return { alice, bob, conversationId }
}

describe('DeepL helpers', () => {
  test('only one- or two-word texts pin the source language', () => {
    expect(deeplRequestBody('hi', 'English', 'French')).toEqual({ text: ['hi'], target_lang: 'FR', source_lang: 'EN' })
    expect(deeplRequestBody('good morning', 'Portuguese', 'Japanese')).toMatchObject({ source_lang: 'PT', target_lang: 'JA' })
    expect(deeplRequestBody('l am great', 'Portuguese', 'Japanese')).toEqual({ text: ['l am great'], target_lang: 'JA' })
    expect(deeplRequestBody('hello there', 'Klingon', 'Spanish')).toEqual({ text: ['hello there'], target_lang: 'ES' })
  })

  test('detected DeepL codes map back to app languages', () => {
    expect(languageFromDeepl('EN')).toBe('English')
    expect(languageFromDeepl('pt-BR')).toBe('Portuguese')
    expect(languageFromDeepl('JA')).toBe('Japanese')
    expect(languageFromDeepl('ZH')).toBeUndefined()
    expect(languageFromDeepl(undefined)).toBeUndefined()
  })
})

describe('users', () => {
  test('store assigns a stable, well-formed PIN', async () => {
    const t = setup()
    const alice = await signUp(t, 'Alice')
    expect(alice.pin).toMatch(/^AFJ-[A-Z0-9]{4}$/)
    const again = await alice.as.mutation(api.users.store, {})
    expect(again).toEqual(alice.id)
    expect((await alice.as.query(api.users.me, {}))!.pin).toEqual(alice.pin)
  })

  test('findByPin needs an exact PIN and marks your own', async () => {
    const t = setup()
    const alice = await signUp(t, 'Alice')
    const bob = await signUp(t, 'Bob')
    expect(await alice.as.query(api.users.findByPin, { pin: bob.pin.toLowerCase() })).toMatchObject({ name: 'Bob', isSelf: false })
    expect(await alice.as.query(api.users.findByPin, { pin: alice.pin })).toMatchObject({ isSelf: true })
    expect(await alice.as.query(api.users.findByPin, { pin: 'Bob' })).toBeNull()
  })
})

describe('conversations', () => {
  test('a pair of people only ever gets one direct chat', async () => {
    const t = setup()
    const { alice, bob, conversationId } = await directChat(t)
    expect(await alice.as.mutation(api.conversations.startDirect, { pin: bob.pin })).toEqual(conversationId)
    expect(await bob.as.mutation(api.conversations.startDirect, { pin: alice.pin })).toEqual(conversationId)
    expect(await alice.as.query(api.conversations.listMine, { archived: false })).toHaveLength(1)
  })

  test('non-members can’t read or send', async () => {
    const t = setup()
    const { conversationId } = await directChat(t)
    const carol = await signUp(t, 'Carol')
    const result = await carol.as.query(api.messages.list, { conversationId, paginationOpts: page })
    expect(result.page).toHaveLength(0)
    await expect(carol.as.mutation(api.messages.send, { conversationId, body: 'hi' })).rejects.toThrow(/not part of this conversation/)
  })

  test('unread counts rise on send and clear on markRead; read receipts follow', async () => {
    const t = setup()
    const { alice, bob, conversationId } = await directChat(t)
    await alice.as.mutation(api.messages.send, { conversationId, body: 'Hello!' })
    await alice.as.mutation(api.messages.send, { conversationId, body: 'Are you there?' })

    const [bobChat] = await bob.as.query(api.conversations.listMine, { archived: false })
    expect(bobChat.unreadCount).toBe(2)
    expect(bobChat.lastMessagePreview).toBe('Are you there?')
    let aliceView = await alice.as.query(api.messages.list, { conversationId, paginationOpts: page })
    expect(aliceView.page.every((message) => !message.readByAll)).toBe(true)

    await bob.as.mutation(api.conversations.markRead, { conversationId })
    expect((await bob.as.query(api.conversations.listMine, { archived: false }))[0].unreadCount).toBe(0)
    aliceView = await alice.as.query(api.messages.list, { conversationId, paginationOpts: page })
    expect(aliceView.page.every((message) => message.readByAll)).toBe(true)
  })

  test('blocking stops messages in both directions until unblocked', async () => {
    const t = setup()
    const { alice, bob, conversationId } = await directChat(t)
    await bob.as.mutation(api.conversations.block, { conversationId })
    await expect(alice.as.mutation(api.messages.send, { conversationId, body: 'hi' })).rejects.toThrow(/can’t message/)
    await expect(bob.as.mutation(api.messages.send, { conversationId, body: 'hi' })).rejects.toThrow(/can’t message/)
    expect((await bob.as.query(api.conversations.listMine, { archived: false }))[0].blockedByMe).toBe(true)
    const rejection = await alice.as.mutation(api.messages.send, { conversationId, body: 'hi' }).catch((error: unknown) => error)
    expect(rejection).toBeInstanceOf(ConvexError)
    expect((rejection as ConvexError<{ code: string }>).data).toMatchObject({ code: 'blocked' })
    await bob.as.mutation(api.conversations.unblock, { conversationId })
    await expect(alice.as.mutation(api.messages.send, { conversationId, body: 'hi again' })).resolves.toBeTruthy()
  })

  test('groups add members by PIN and let people leave', async () => {
    const t = setup()
    const alice = await signUp(t, 'Alice')
    const bob = await signUp(t, 'Bob', 'Spanish')
    const carol = await signUp(t, 'Carol', 'Japanese')
    const groupId = await alice.as.mutation(api.conversations.createGroup, { name: 'Family', pins: [bob.pin] })
    expect(await alice.as.mutation(api.conversations.addMembers, { conversationId: groupId, pins: [carol.pin, bob.pin] })).toBe(1)
    const [group] = await carol.as.query(api.conversations.listMine, { archived: false })
    expect(group.members.map((member) => member.name).sort()).toEqual(['Alice', 'Bob'])
    await carol.as.mutation(api.conversations.leave, { conversationId: groupId })
    expect(await carol.as.query(api.conversations.listMine, { archived: false })).toHaveLength(0)
  })
})

describe('group roles and bans', () => {
  async function groupOfFour(t: Test) {
    const owner = await signUp(t, 'Olivia')
    const admin = await signUp(t, 'Adam')
    const member = await signUp(t, 'Mia')
    const other = await signUp(t, 'Max')
    const conversationId = await owner.as.mutation(api.conversations.createGroup, { name: 'Team', pins: [admin.pin, member.pin, other.pin] })
    await owner.as.mutation(api.conversations.setRole, { conversationId, userId: admin.id, role: 'admin' })
    return { owner, admin, member, other, conversationId }
  }

  test('regular members can’t add, remove, ban or change roles', async () => {
    const t = setup()
    const { member, other, conversationId } = await groupOfFour(t)
    const newcomer = await signUp(t, 'Nora')
    await expect(member.as.mutation(api.conversations.addMembers, { conversationId, pins: [newcomer.pin] })).rejects.toThrow(/Only group admins/)
    await expect(member.as.mutation(api.conversations.removeMember, { conversationId, userId: other.id })).rejects.toThrow(/Only group admins/)
    await expect(member.as.mutation(api.conversations.banMember, { conversationId, userId: other.id })).rejects.toThrow(/Only group admins/)
    await expect(member.as.mutation(api.conversations.setRole, { conversationId, userId: other.id, role: 'admin' })).rejects.toThrow(/Only the group owner/)
    expect(await member.as.query(api.conversations.bannedMembers, { conversationId })).toEqual([])
  })

  test('admins manage members but not the owner or other admins; setRole is owner-only', async () => {
    const t = setup()
    const { owner, admin, member, conversationId } = await groupOfFour(t)
    await expect(admin.as.mutation(api.conversations.removeMember, { conversationId, userId: owner.id })).rejects.toThrow(/owner/)
    await expect(admin.as.mutation(api.conversations.setRole, { conversationId, userId: member.id, role: 'admin' })).rejects.toThrow(/Only the group owner/)
    await owner.as.mutation(api.conversations.setRole, { conversationId, userId: member.id, role: 'admin' })
    await expect(admin.as.mutation(api.conversations.removeMember, { conversationId, userId: member.id })).rejects.toThrow(/Only the owner can remove an admin/)
    await owner.as.mutation(api.conversations.removeMember, { conversationId, userId: member.id })
    expect(await member.as.query(api.conversations.listMine, { archived: false })).toHaveLength(0)
    const [view] = await owner.as.query(api.conversations.listMine, { archived: false })
    expect(view.myRole).toBe('owner')
    expect(view.members.find((person) => person._id === admin.id)?.role).toBe('admin')
  })

  test('removed people can’t send or read; banned people can’t be re-added until unbanned', async () => {
    const t = setup()
    const { owner, admin, member, other, conversationId } = await groupOfFour(t)
    await admin.as.mutation(api.conversations.removeMember, { conversationId, userId: member.id })
    await expect(member.as.mutation(api.messages.send, { conversationId, body: 'still here?' })).rejects.toThrow(/not part of this conversation/)
    expect((await member.as.query(api.messages.list, { conversationId, paginationOpts: page })).page).toHaveLength(0)

    await admin.as.mutation(api.conversations.banMember, { conversationId, userId: other.id })
    expect((await admin.as.query(api.conversations.bannedMembers, { conversationId })).map((person) => person.name)).toEqual(['Max'])
    await expect(owner.as.mutation(api.conversations.addMembers, { conversationId, pins: [other.pin] })).rejects.toThrow(/banned from this group/)
    await admin.as.mutation(api.conversations.unbanMember, { conversationId, userId: other.id })
    expect(await owner.as.mutation(api.conversations.addMembers, { conversationId, pins: [other.pin] })).toBe(1)
  })

  test('when the owner leaves, the longest-standing admin takes over', async () => {
    const t = setup()
    const { owner, admin, member, conversationId } = await groupOfFour(t)
    await owner.as.mutation(api.conversations.leave, { conversationId })
    const [view] = await admin.as.query(api.conversations.listMine, { archived: false })
    expect(view.myRole).toBe('owner')
    const [memberView] = await member.as.query(api.conversations.listMine, { archived: false })
    expect(memberView.myRole).toBe('member')
  })
})

describe('invite links', () => {
  test('a personal link opens the existing direct chat, and resetting it kills the old code', async () => {
    const t = setup()
    const { alice, bob, conversationId } = await directChat(t)
    expect(await bob.as.query(api.invites.myInvite, {})).toBeNull()
    const code = await bob.as.mutation(api.invites.ensureMyInvite, {})
    expect(code).toMatch(/^[A-Z0-9]{10}$/)
    expect(await bob.as.mutation(api.invites.ensureMyInvite, {})).toBe(code)

    expect(await alice.as.query(api.invites.preview, { code: code.toLowerCase() })).toMatchObject({ kind: 'user', name: 'Bob', isSelf: false })
    expect(await bob.as.query(api.invites.preview, { code })).toMatchObject({ isSelf: true })
    expect(await alice.as.mutation(api.invites.accept, { code })).toEqual(conversationId)
    await expect(bob.as.mutation(api.invites.accept, { code })).rejects.toThrow(/your own invite/)

    const carol = await signUp(t, 'Carol')
    const carolChat = await carol.as.mutation(api.invites.accept, { code })
    expect(carolChat).not.toEqual(conversationId)
    expect(await carol.as.mutation(api.invites.accept, { code })).toEqual(carolChat)

    const fresh = await bob.as.mutation(api.invites.resetMyInvite, {})
    expect(fresh).not.toBe(code)
    expect(await alice.as.query(api.invites.preview, { code })).toBeNull()
    const rejection = await alice.as.mutation(api.invites.accept, { code }).catch((error: unknown) => error)
    expect((rejection as ConvexError<{ code: string }>).data).toMatchObject({ code: 'invalid_invite' })
  })

  test('group links are admin-only, can be turned off, and refuse banned people', async () => {
    const t = setup()
    const owner = await signUp(t, 'Olivia')
    const member = await signUp(t, 'Mia')
    const banned = await signUp(t, 'Max')
    const conversationId = await owner.as.mutation(api.conversations.createGroup, { name: 'Team', pins: [member.pin, banned.pin] })
    await expect(member.as.mutation(api.invites.createGroupInvite, { conversationId })).rejects.toThrow(/Only group admins/)
    expect(await member.as.query(api.invites.groupInvite, { conversationId })).toBeNull()

    const code = await owner.as.mutation(api.invites.createGroupInvite, { conversationId })
    expect(await owner.as.query(api.invites.groupInvite, { conversationId })).toBe(code)
    await owner.as.mutation(api.conversations.banMember, { conversationId, userId: banned.id })

    const nora = await signUp(t, 'Nora')
    expect(await nora.as.query(api.invites.preview, { code })).toMatchObject({ kind: 'group', name: 'Team', memberCount: 2, alreadyMember: false, banned: false })
    expect(await nora.as.mutation(api.invites.accept, { code })).toEqual(conversationId)
    expect(await nora.as.mutation(api.invites.accept, { code })).toEqual(conversationId)
    const [view] = await nora.as.query(api.conversations.listMine, { archived: false })
    expect(view.myRole).toBe('member')
    expect(view.members).toHaveLength(2)

    expect(await banned.as.query(api.invites.preview, { code })).toMatchObject({ banned: true })
    const rejection = await banned.as.mutation(api.invites.accept, { code }).catch((error: unknown) => error)
    expect((rejection as ConvexError<{ code: string }>).data).toMatchObject({ code: 'banned' })

    await owner.as.mutation(api.invites.disableGroupInvite, { conversationId })
    expect(await owner.as.query(api.invites.groupInvite, { conversationId })).toBeNull()
    const late = await signUp(t, 'Lena')
    await expect(late.as.mutation(api.invites.accept, { code })).rejects.toThrow(/no longer valid/)
  })

  test('group links respect the member cap', async () => {
    const t = setup()
    const owner = await signUp(t, 'Olivia')
    const member = await signUp(t, 'Mia')
    const conversationId = await owner.as.mutation(api.conversations.createGroup, { name: 'Big', pins: [member.pin] })
    const code = await owner.as.mutation(api.invites.createGroupInvite, { conversationId })
    await t.run(async (ctx) => {
      for (let i = 0; i < 48; i++) {
        const userId = await ctx.db.insert('users', { tokenIdentifier: `filler|${i}`, name: `Filler ${i}`, pin: `AFJ-F${String(i).padStart(3, '0')}`, language: 'English' })
        await ctx.db.insert('members', { conversationId, userId, role: 'member', lastReadAt: 0, unreadCount: 0, muted: false, archived: false, translationEnabled: true, lastMessageAt: 0 })
      }
    })
    const newcomer = await signUp(t, 'Nora')
    await expect(newcomer.as.mutation(api.invites.accept, { code })).rejects.toThrow(/up to 50 members/)
  })
})

describe('messages', () => {
  test('only the sender can edit or delete, and delete can be undone', async () => {
    const t = setup()
    const { alice, bob, conversationId } = await directChat(t)
    const messageId = await alice.as.mutation(api.messages.send, { conversationId, body: 'Draft' })
    await expect(bob.as.mutation(api.messages.edit, { messageId, body: 'Hacked' })).rejects.toThrow(/your own messages/)
    await expect(bob.as.mutation(api.messages.remove, { messageId })).rejects.toThrow(/your own messages/)

    await alice.as.mutation(api.messages.edit, { messageId, body: 'Final' })
    let [message] = (await bob.as.query(api.messages.list, { conversationId, paginationOpts: page })).page
    expect(message).toMatchObject({ body: 'Final', edited: true })

    await alice.as.mutation(api.messages.remove, { messageId })
    ;[message] = (await bob.as.query(api.messages.list, { conversationId, paginationOpts: page })).page
    expect(message).toMatchObject({ deleted: true, body: '' })

    await alice.as.mutation(api.messages.restore, { messageId })
    ;[message] = (await bob.as.query(api.messages.list, { conversationId, paginationOpts: page })).page
    expect(message).toMatchObject({ deleted: false, body: 'Final' })
  })

  test('reactions toggle, one per person', async () => {
    const t = setup()
    const { alice, bob, conversationId } = await directChat(t)
    const messageId = await alice.as.mutation(api.messages.send, { conversationId, body: 'News!' })
    await bob.as.mutation(api.messages.react, { messageId, emoji: '❤️' })
    await bob.as.mutation(api.messages.react, { messageId, emoji: '😂' })
    let [message] = (await alice.as.query(api.messages.list, { conversationId, paginationOpts: page })).page
    expect(message.reactions).toEqual([{ emoji: '😂', userId: bob.id }])
    await bob.as.mutation(api.messages.react, { messageId, emoji: '😂' })
    ;[message] = (await alice.as.query(api.messages.list, { conversationId, paginationOpts: page })).page
    expect(message.reactions).toEqual([])
  })

  test('translations are queued per reader language and stale results are ignored', async () => {
    const t = setup()
    const { alice, bob, conversationId } = await directChat(t)
    const messageId = await alice.as.mutation(api.messages.send, { conversationId, body: 'Good morning!' })

    let [message] = (await bob.as.query(api.messages.list, { conversationId, paginationOpts: page })).page
    expect(message.translation).toMatchObject({ status: 'pending', text: null })
    const job = await t.query(internal.translations.getJob, { messageId })
    expect(job?.languages).toEqual(['Spanish'])

    await alice.as.mutation(api.messages.edit, { messageId, body: 'Good evening!' })
    await t.mutation(internal.translations.save, { messageId, language: 'Spanish', version: job!.version, status: 'done', text: '¡Buenos días!' })
    ;[message] = (await bob.as.query(api.messages.list, { conversationId, paginationOpts: page })).page
    expect(message.translation?.status).toBe('pending')

    const fresh = await t.query(internal.translations.getJob, { messageId })
    await t.mutation(internal.translations.save, { messageId, language: 'Spanish', version: fresh!.version, status: 'done', text: '¡Buenas noches!' })
    await t.mutation(internal.translations.save, { messageId, language: 'Spanish', version: fresh!.version, status: 'done', text: '¡Buenas noches!' })
    ;[message] = (await bob.as.query(api.messages.list, { conversationId, paginationOpts: page })).page
    expect(message.translation).toMatchObject({ status: 'done', text: '¡Buenas noches!' })
    const [own] = (await alice.as.query(api.messages.list, { conversationId, paginationOpts: page })).page
    expect(own.outgoingTranslation).toMatchObject({ language: 'Spanish', status: 'done', text: '¡Buenas noches!' })
  })

  test('missing translations after a language change can be requested once', async () => {
    const t = setup()
    const alice = await signUp(t, 'Alice')
    const bob = await signUp(t, 'Bob')
    const conversationId = await alice.as.mutation(api.conversations.startDirect, { pin: bob.pin })
    const messageId = await alice.as.mutation(api.messages.send, { conversationId, body: 'hi' })
    expect(await t.query(internal.translations.getJob, { messageId })).toMatchObject({ languages: [] })

    await bob.as.mutation(api.users.setLanguage, { language: 'French' })
    let [message] = (await bob.as.query(api.messages.list, { conversationId, paginationOpts: page })).page
    expect(message.translation).toMatchObject({ status: 'missing', text: null })
    let [own] = (await alice.as.query(api.messages.list, { conversationId, paginationOpts: page })).page
    expect(own.outgoingTranslation).toMatchObject({ language: 'French', status: 'missing' })

    expect(await bob.as.mutation(api.messages.requestTranslations, { messageIds: [messageId] })).toBe(1)
    expect(await alice.as.mutation(api.messages.requestTranslations, { messageIds: [messageId] })).toBe(0)
    ;[message] = (await bob.as.query(api.messages.list, { conversationId, paginationOpts: page })).page
    expect(message.translation).toMatchObject({ status: 'pending', text: null })
    expect(await t.query(internal.translations.getJob, { messageId })).toMatchObject({ languages: ['French'] })

    const carol = await signUp(t, 'Carol', 'Spanish')
    expect(await carol.as.mutation(api.messages.requestTranslations, { messageIds: [messageId] })).toBe(0)
    ;[own] = (await alice.as.query(api.messages.list, { conversationId, paginationOpts: page })).page
    expect(own.outgoingTranslation).toMatchObject({ language: 'French', status: 'pending' })
  })

  test('text already in the reader’s language is saved as same and shows no translation', async () => {
    const t = setup()
    const { alice, bob, conversationId } = await directChat(t)
    const messageId = await alice.as.mutation(api.messages.send, { conversationId, body: 'Hola, esto ya está en español.' })
    const job = await t.query(internal.translations.getJob, { messageId })
    await t.mutation(internal.translations.save, { messageId, language: 'Spanish', version: job!.version, status: 'same', detectedLanguage: 'Spanish' })
    const [message] = (await bob.as.query(api.messages.list, { conversationId, paginationOpts: page })).page
    expect(message.translation).toEqual({ status: 'same', text: null, detectedLanguage: 'Spanish' })
    expect(await bob.as.mutation(api.messages.requestTranslations, { messageIds: [messageId] })).toBe(0)
  })

  test('push targets skip the sender and muted members', async () => {
    const t = setup()
    const { alice, bob, conversationId } = await directChat(t)
    await bob.as.mutation(api.pushSubscriptions.save, { endpoint: 'https://push.example/bob', p256dh: 'key', auth: 'secret' })
    await alice.as.mutation(api.pushSubscriptions.save, { endpoint: 'https://push.example/alice', p256dh: 'key', auth: 'secret' })
    const messageId = (await alice.as.mutation(api.messages.send, { conversationId, body: 'Ping' })) as Id<'messages'>
    let targets = await t.query(internal.pushSubscriptions.targetsForMessage, { messageId })
    expect(targets.map((target) => target.endpoint)).toEqual(['https://push.example/bob'])
    expect(JSON.parse(targets[0].payload)).toMatchObject({ title: 'Alice', body: 'Ping', url: `/chat?c=${conversationId}` })

    await bob.as.mutation(api.conversations.setMuted, { conversationId, muted: true })
    targets = await t.query(internal.pushSubscriptions.targetsForMessage, { messageId })
    expect(targets).toHaveLength(0)
  })
})

describe('pinned messages', () => {
  test('anyone can pin in a direct chat, only admins in groups, and deleting unpins', async () => {
    const t = setup()
    const { alice, bob, conversationId } = await directChat(t)
    const messageId = await alice.as.mutation(api.messages.send, { conversationId, body: 'Meet at 6' })
    await bob.as.mutation(api.messages.setPinned, { messageId, pinned: true })
    expect(await alice.as.query(api.messages.pinned, { conversationId })).toMatchObject([{ _id: messageId, summary: 'Meet at 6', pinnedByName: 'Bob' }])
    const [view] = (await alice.as.query(api.messages.list, { conversationId, paginationOpts: page })).page
    expect(view.pinned).toBe(true)

    await alice.as.mutation(api.messages.remove, { messageId })
    expect(await alice.as.query(api.messages.pinned, { conversationId })).toEqual([])

    const carol = await signUp(t, 'Carol')
    const groupId = await alice.as.mutation(api.conversations.createGroup, { name: 'Team', pins: [bob.pin, carol.pin] })
    const groupMessage = await carol.as.mutation(api.messages.send, { conversationId: groupId, body: 'Agenda' })
    await expect(carol.as.mutation(api.messages.setPinned, { messageId: groupMessage, pinned: true })).rejects.toThrow(/Only group admins/)
    await alice.as.mutation(api.messages.setPinned, { messageId: groupMessage, pinned: true })
    await expect(bob.as.query(api.messages.pinned, { conversationId: groupId })).resolves.toHaveLength(1)
    expect(await carol.as.query(api.messages.pinned, { conversationId })).toEqual([])
  })

  test('recentPinned only lists pins from your own chats, newest first', async () => {
    const t = setup()
    const { alice, bob, conversationId } = await directChat(t)
    const carol = await signUp(t, 'Carol')
    const first = await alice.as.mutation(api.messages.send, { conversationId, body: 'First pin' })
    const second = await bob.as.mutation(api.messages.send, { conversationId, body: 'Second pin' })
    await alice.as.mutation(api.messages.setPinned, { messageId: first, pinned: true })
    await alice.as.mutation(api.messages.setPinned, { messageId: second, pinned: true })

    const carolChat = await carol.as.mutation(api.conversations.startDirect, { pin: bob.pin })
    const hidden = await carol.as.mutation(api.messages.send, { conversationId: carolChat, body: 'Not for Alice' })
    await carol.as.mutation(api.messages.setPinned, { messageId: hidden, pinned: true })

    const pins = await alice.as.query(api.messages.recentPinned, {})
    expect(pins.map((pin) => pin.summary)).toEqual(['Second pin', 'First pin'])
    expect(pins[0]).toMatchObject({ chatName: 'Bob', senderName: 'Bob', group: false, conversationId })
    expect(pins[1].senderName).toBe('You')
  })

  test('a chat holds at most 10 pins', async () => {
    const t = setup()
    const { alice, conversationId } = await directChat(t)
    const ids = await t.run(async (ctx) => {
      const inserted = []
      for (let i = 0; i < 11; i++) inserted.push(await ctx.db.insert('messages', { conversationId, senderId: alice.id, body: `Note ${i}`, sourceLanguage: 'English' }))
      return inserted
    })
    const extra = ids.pop()!
    for (const messageId of ids) await alice.as.mutation(api.messages.setPinned, { messageId, pinned: true })
    await expect(alice.as.mutation(api.messages.setPinned, { messageId: extra, pinned: true })).rejects.toThrow(/up to 10/)
    expect(await alice.as.query(api.messages.pinned, { conversationId })).toHaveLength(10)
  })
})

describe('forwarding', () => {
  test('forwarded messages copy their files and are labelled', async () => {
    const t = setup()
    const { alice, bob, conversationId } = await directChat(t)
    const carol = await signUp(t, 'Carol')
    const groupId = await alice.as.mutation(api.conversations.createGroup, { name: 'Team', pins: [carol.pin] })
    const storageId = await t.run(async (ctx) => await ctx.storage.store(new Blob(['agenda'], { type: 'text/plain' })))
    const messageId = await bob.as.mutation(api.messages.send, { conversationId, body: 'See attached', attachments: [{ storageId, kind: 'file', name: 'agenda.txt' }] })

    expect(await alice.as.action(api.messages.forward, { messageId, conversationIds: [groupId] })).toBe(1)
    const [copy] = (await carol.as.query(api.messages.list, { conversationId: groupId, paginationOpts: page })).page
    expect(copy).toMatchObject({ body: 'See attached', forwarded: true, senderName: 'Alice' })
    expect(copy.attachments).toHaveLength(1)
    expect(copy.attachments[0].storageId).not.toEqual(storageId)
    expect(copy.attachments[0].url).toBeTruthy()
    const [groupChat] = await carol.as.query(api.conversations.listMine, { archived: false })
    expect(groupChat.unreadCount).toBe(1)
  })

  test('you must belong to the source and every target, and blocks apply', async () => {
    const t = setup()
    const { alice, bob, conversationId } = await directChat(t)
    const carol = await signUp(t, 'Carol')
    const messageId = await alice.as.mutation(api.messages.send, { conversationId, body: 'Private' })
    const carolChat = await carol.as.mutation(api.conversations.startDirect, { pin: bob.pin })
    await expect(carol.as.action(api.messages.forward, { messageId, conversationIds: [carolChat] })).rejects.toThrow(/not part of this conversation/)
    await expect(alice.as.action(api.messages.forward, { messageId, conversationIds: [carolChat] })).rejects.toThrow(/not part of this conversation/)

    const aliceCarol = await alice.as.mutation(api.conversations.startDirect, { pin: carol.pin })
    await carol.as.mutation(api.conversations.block, { conversationId: aliceCarol })
    const rejection = await alice.as.action(api.messages.forward, { messageId, conversationIds: [aliceCarol] }).catch((error: unknown) => error)
    expect((rejection as ConvexError<{ code: string }>).data).toMatchObject({ code: 'blocked' })
    await expect(alice.as.action(api.messages.forward, { messageId, conversationIds: [] })).rejects.toThrow(/at least one/)
  })
})

describe('link previews', () => {
  test('first URL is found and trailing punctuation dropped', () => {
    expect(firstUrl('see https://example.com/page?x=1). thanks')).toBe('https://example.com/page?x=1')
    expect(firstUrl('no links here')).toBeNull()
  })

  test('private, local and odd URLs are never fetched', () => {
    expect(isSafeUrl('https://example.com/a')).toBe(true)
    for (const url of ['http://localhost:3000', 'http://127.0.0.1/', 'http://10.0.0.5', 'http://192.168.1.1', 'http://172.20.0.1', 'http://169.254.169.254/latest', 'http://[::1]/', 'http://[fd00::1]/', 'ftp://example.com', 'https://user:pass@example.com', 'https://example.com:8443/', 'http://intranet', 'http://printer.local']) {
      expect(isSafeUrl(url)).toBe(false)
    }
  })

  test('Open Graph tags win over <title>, and entities are decoded', () => {
    const html = `<html><head><title>Fallback</title>
      <meta property="og:title" content="Caf&eacute; &amp; Co" />
      <meta content='Fresh bread daily' name='description'>
      <meta property="og:image" content="/img/hero.jpg">
      <meta property="og:site_name" content="Bakery">
    </head></html>`
    expect(parseMetadata(html, 'https://bakery.example/menu')).toEqual({
      url: 'https://bakery.example/menu',
      title: 'Caf&eacute; & Co',
      description: 'Fresh bread daily',
      image: 'https://bakery.example/img/hero.jpg',
      siteName: 'Bakery',
    })
    expect(parseMetadata('<title> Just a title </title>', 'http://plain.example/')).toMatchObject({ title: 'Just a title', siteName: 'plain.example', image: undefined })
    expect(parseMetadata('<p>nothing</p>', 'https://x.example/')).toBeNull()
  })
})

describe('calls', () => {
  beforeEach(() => {
    vi.stubEnv('LIVEKIT_URL', 'wss://afjini-test.livekit.cloud')
    vi.stubEnv('LIVEKIT_API_KEY', 'APItest')
    vi.stubEnv('LIVEKIT_API_SECRET', 'test-secret-that-is-long-enough-for-hs256')
  })
  afterEach(() => vi.unstubAllEnvs())

  async function lastMessage(as: Awaited<ReturnType<typeof signUp>>['as'], conversationId: Id<'conversations'>) {
    return (await as.query(api.messages.list, { conversationId, paginationOpts: page })).page[0]
  }

  test('calls need the LiveKit keys, membership, and an unblocked chat', async () => {
    const t = setup()
    const { alice, bob, conversationId } = await directChat(t)
    const carol = await signUp(t, 'Carol')
    await expect(carol.as.mutation(api.calls.start, { conversationId, kind: 'voice' })).rejects.toThrow(/not part of this conversation/)

    await bob.as.mutation(api.conversations.block, { conversationId })
    const rejection = await alice.as.mutation(api.calls.start, { conversationId, kind: 'voice' }).catch((error: unknown) => error)
    expect((rejection as ConvexError<{ code: string }>).data).toMatchObject({ code: 'blocked' })
    await bob.as.mutation(api.conversations.unblock, { conversationId })

    vi.stubEnv('LIVEKIT_API_SECRET', '')
    const unconfigured = await alice.as.mutation(api.calls.start, { conversationId, kind: 'voice' }).catch((error: unknown) => error)
    expect((unconfigured as ConvexError<{ code: string }>).data).toMatchObject({ code: 'calls_unconfigured' })
  })

  test('callees ring, one call per chat, and tokens only go to joined members', async () => {
    const t = setup()
    const { alice, bob, conversationId } = await directChat(t)
    const { callId } = await alice.as.mutation(api.calls.start, { conversationId, kind: 'video' })
    expect(await alice.as.mutation(api.calls.start, { conversationId, kind: 'voice' })).toEqual({ callId, kind: 'video' })

    const [ring] = await bob.as.query(api.calls.incoming, {})
    expect(ring).toMatchObject({ callId, kind: 'video', callerName: 'Alice', chatName: 'Alice', group: false })
    expect(await alice.as.query(api.calls.incoming, {})).toEqual([])
    expect(await bob.as.query(api.calls.activeIn, { conversationId })).toMatchObject({ status: 'ringing', myState: 'ringing', joinedCount: 1 })

    const carol = await signUp(t, 'Carol')
    await expect(carol.as.action(api.calls.token, { callId })).rejects.toThrow(/already ended/)
    await expect(bob.as.action(api.calls.token, { callId })).rejects.toThrow(/already ended/)
    const grant = await alice.as.action(api.calls.token, { callId })
    expect(grant.url).toBe('wss://afjini-test.livekit.cloud')
    expect(grant.token.split('.')).toHaveLength(3)

    await bob.as.mutation(api.calls.join, { callId })
    expect(await bob.as.query(api.calls.activeIn, { conversationId })).toMatchObject({ status: 'active', joinedCount: 2 })
    expect(await bob.as.query(api.calls.incoming, {})).toEqual([])
  })

  test('declining a direct call ends it with one call-log message', async () => {
    const t = setup()
    const { alice, bob, conversationId } = await directChat(t)
    const { callId } = await alice.as.mutation(api.calls.start, { conversationId, kind: 'voice' })
    await bob.as.mutation(api.calls.decline, { callId })
    expect(await alice.as.query(api.calls.activeIn, { conversationId })).toBeNull()
    const message = await lastMessage(alice.as, conversationId)
    expect(message.call).toEqual({ kind: 'voice', outcome: 'declined', durationMs: 0 })
    expect(message.translation).toBeNull()
    await expect(bob.as.mutation(api.calls.join, { callId })).rejects.toThrow(/already ended/)
    await expect(alice.as.mutation(api.messages.edit, { messageId: message._id, body: 'x' })).rejects.toThrow(/Call history/)
  })

  test('unanswered calls become missed after the ring timeout and count as unread', async () => {
    const t = setup()
    const { alice, bob, conversationId } = await directChat(t)
    const { callId } = await alice.as.mutation(api.calls.start, { conversationId, kind: 'video' })
    await t.mutation(internal.calls.ringTimeout, { callId })
    const [bobChat] = await bob.as.query(api.conversations.listMine, { archived: false })
    expect(bobChat.unreadCount).toBe(1)
    expect(bobChat.lastMessagePreview).toBe('Missed video call')
    const [aliceChat] = await alice.as.query(api.conversations.listMine, { archived: false })
    expect(aliceChat.unreadCount).toBe(0)
    expect(await bob.as.query(api.calls.incoming, {})).toEqual([])
  })

  test('group calls keep going until the last person leaves', async () => {
    const t = setup()
    const alice = await signUp(t, 'Alice')
    const bob = await signUp(t, 'Bob')
    const carol = await signUp(t, 'Carol')
    const conversationId = await alice.as.mutation(api.conversations.createGroup, { name: 'Team', pins: [bob.pin, carol.pin] })
    const { callId } = await alice.as.mutation(api.calls.start, { conversationId, kind: 'voice' })
    expect(await carol.as.query(api.calls.incoming, {})).toMatchObject([{ chatName: 'Team', group: true }])

    await bob.as.mutation(api.calls.join, { callId })
    await alice.as.mutation(api.calls.leave, { callId })
    expect(await bob.as.query(api.calls.activeIn, { conversationId })).toMatchObject({ status: 'active', joinedCount: 1 })
    await t.mutation(internal.calls.ringTimeout, { callId })
    expect(await carol.as.query(api.calls.incoming, {})).toEqual([])

    await carol.as.mutation(api.calls.join, { callId })
    await bob.as.mutation(api.calls.leave, { callId })
    await t.mutation(internal.calls.participantLeft, { room: callId, identity: carol.id })
    expect(await bob.as.query(api.calls.activeIn, { conversationId })).toBeNull()
    const messages = (await bob.as.query(api.messages.list, { conversationId, paginationOpts: page })).page
    expect(messages.filter((message) => message.call)).toHaveLength(1)
    expect(messages[0].call).toMatchObject({ kind: 'voice', outcome: 'ended' })
  })

  test('a room_finished webhook for an unanswered call logs a missed call', async () => {
    const t = setup()
    const { alice, conversationId } = await directChat(t)
    const { callId } = await alice.as.mutation(api.calls.start, { conversationId, kind: 'voice' })
    await t.mutation(internal.calls.roomFinished, { room: callId })
    await t.mutation(internal.calls.roomFinished, { room: callId })
    await t.mutation(internal.calls.roomFinished, { room: 'not-a-call' })
    const messages = (await alice.as.query(api.messages.list, { conversationId, paginationOpts: page })).page
    expect(messages.map((message) => message.call?.outcome)).toEqual(['missed'])
  })
})
