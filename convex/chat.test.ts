/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import presenceTest from '@convex-dev/presence/test'
import rateLimiterTest from '@convex-dev/rate-limiter/test'
import workpoolTest from '@convex-dev/workpool/test'
import { api, internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
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
    expect(message.translation).toEqual({ status: 'pending', text: null })
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
    expect(message.translation).toEqual({ status: 'done', text: '¡Buenas noches!' })
    const [own] = (await alice.as.query(api.messages.list, { conversationId, paginationOpts: page })).page
    expect(own.outgoingTranslation).toMatchObject({ language: 'Spanish', status: 'done', text: '¡Buenas noches!' })
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
