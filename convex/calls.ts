import { ConvexError, v } from 'convex/values'
import { AccessToken } from 'livekit-server-sdk'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import { action, env, internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { getCurrentUser, getMembership, hasBlocked, isBlockedBetween, listMembers, requireMember, requireUser } from './lib/auth'
import { pushPool, rateLimiter } from './lib/limits'
import { summarize } from './messages'
import { callKind } from './schema'

export const RING_TIMEOUT_MS = 45_000
const TOKEN_TTL = '10m'

type Outcome = NonNullable<Doc<'messages'>['call']>['outcome']

function callsConfigured() {
  return Boolean(env.LIVEKIT_URL && env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET)
}

const notConfigured = () => new ConvexError({ code: 'calls_unconfigured', message: 'Calls aren’t set up yet.' })
const callEnded = () => new ConvexError({ code: 'call_ended', message: 'This call has already ended.' })

async function liveCallIn(ctx: QueryCtx | MutationCtx, conversationId: Id<'conversations'>) {
  for (const status of ['active', 'ringing'] as const) {
    const call = await ctx.db
      .query('calls')
      .withIndex('by_conversationId_and_status', (q) => q.eq('conversationId', conversationId).eq('status', status))
      .first()
    if (call) return call
  }
  return null
}

async function participantsOf(ctx: QueryCtx | MutationCtx, callId: Id<'calls'>) {
  return await ctx.db
    .query('callParticipants')
    .withIndex('by_callId_and_userId', (q) => q.eq('callId', callId))
    .take(60)
}

async function participant(ctx: QueryCtx | MutationCtx, callId: Id<'calls'>, userId: Id<'users'>) {
  return await ctx.db
    .query('callParticipants')
    .withIndex('by_callId_and_userId', (q) => q.eq('callId', callId).eq('userId', userId))
    .unique()
}

async function markJoined(ctx: MutationCtx, call: Doc<'calls'>, userId: Id<'users'>) {
  const row = await participant(ctx, call._id, userId)
  if (row) {
    if (row.state !== 'joined') await ctx.db.patch('callParticipants', row._id, { state: 'joined' })
  } else {
    await ctx.db.insert('callParticipants', { callId: call._id, userId, state: 'joined' })
  }
  if (call.status === 'ringing' && userId !== call.startedBy) {
    await ctx.db.patch('calls', call._id, { status: 'active', answeredAt: Date.now() })
  }
}

async function endCall(ctx: MutationCtx, call: Doc<'calls'>, outcome: Outcome) {
  const now = Date.now()
  await ctx.db.patch('calls', call._id, { status: 'ended', endedAt: now })
  const missed = new Set<Id<'users'>>()
  for (const row of await participantsOf(ctx, call._id)) {
    if (row.state === 'ringing') {
      missed.add(row.userId)
      await ctx.db.patch('callParticipants', row._id, { state: 'missed' })
    } else if (row.state === 'missed') {
      missed.add(row.userId)
    } else if (row.state === 'joined') {
      await ctx.db.patch('callParticipants', row._id, { state: 'left' })
    }
  }

  const conversation = await ctx.db.get('conversations', call.conversationId)
  if (!conversation) return
  const caller = await ctx.db.get('users', call.startedBy)
  const details = { kind: call.kind, outcome, durationMs: call.answeredAt ? now - call.answeredAt : 0 }
  const messageId = await ctx.db.insert('messages', {
    conversationId: call.conversationId,
    senderId: call.startedBy,
    body: '',
    sourceLanguage: caller?.language ?? 'English',
    call: details,
  })
  await ctx.db.patch('conversations', conversation._id, {
    lastMessageAt: now,
    lastMessagePreview: summarize({ body: '', call: details }),
    lastMessageSenderId: call.startedBy,
  })
  for (const member of await listMembers(ctx, call.conversationId)) {
    const bump = outcome !== 'ended' && missed.has(member.userId)
    await ctx.db.patch('members', member._id, { lastMessageAt: now, ...(bump ? { unreadCount: member.unreadCount + 1 } : {}) })
  }
  return messageId
}

/** Ends the call once nobody is left who could still take part in it. */
async function settle(ctx: MutationCtx, callId: Id<'calls'>) {
  const call = await ctx.db.get('calls', callId)
  if (!call || call.status === 'ended') return
  const rows = await participantsOf(ctx, callId)
  const joined = rows.filter((row) => row.state === 'joined').length
  const ringing = rows.filter((row) => row.state === 'ringing').length
  const conversation = await ctx.db.get('conversations', call.conversationId)

  if (call.status === 'ringing') {
    if (joined === 0 || ringing === 0) {
      const declined = rows.some((row) => row.state === 'declined')
      await endCall(ctx, call, declined && conversation?.kind === 'direct' ? 'declined' : 'missed')
    }
    return
  }
  if (joined === 0 || (conversation?.kind === 'direct' && joined < 2)) await endCall(ctx, call, 'ended')
}

async function requireLiveCall(ctx: MutationCtx, callId: Id<'calls'>, userId: Id<'users'>) {
  const call = await ctx.db.get('calls', callId)
  if (!call || call.status === 'ended') throw callEnded()
  await requireMember(ctx, call.conversationId, userId)
  return call
}

export const start = mutation({
  args: { conversationId: v.id('conversations'), kind: callKind },
  handler: async (ctx, { conversationId, kind }) => {
    const user = await requireUser(ctx)
    await requireMember(ctx, conversationId, user._id)
    if (!callsConfigured()) throw notConfigured()
    const conversation = await ctx.db.get('conversations', conversationId)
    if (!conversation) throw new ConvexError('Conversation not found.')
    const members = await listMembers(ctx, conversationId)
    const others = members.filter((member) => member.userId !== user._id)
    if (!others.length) throw new ConvexError('There’s nobody else in this chat to call.')
    if (conversation.kind === 'direct' && (await isBlockedBetween(ctx, user._id, others[0].userId))) {
      throw new ConvexError({ code: 'blocked', message: 'You can’t call this person.' })
    }

    const existing = await liveCallIn(ctx, conversationId)
    if (existing) {
      await markJoined(ctx, existing, user._id)
      return { callId: existing._id, kind: existing.kind }
    }

    await rateLimiter.limit(ctx, 'startCall', { key: user._id, throws: true })
    const callId = await ctx.db.insert('calls', { conversationId, startedBy: user._id, kind, status: 'ringing', startedAt: Date.now() })
    await ctx.db.insert('callParticipants', { callId, userId: user._id, state: 'joined' })
    for (const member of others) {
      if (await hasBlocked(ctx, member.userId, user._id)) continue
      await ctx.db.insert('callParticipants', { callId, userId: member.userId, state: 'ringing' })
    }
    await ctx.scheduler.runAfter(RING_TIMEOUT_MS, internal.calls.ringTimeout, { callId })
    await pushPool.enqueueAction(ctx, internal.push.notifyCall, { callId })
    return { callId, kind }
  },
})

export const join = mutation({
  args: { callId: v.id('calls') },
  handler: async (ctx, { callId }) => {
    const user = await requireUser(ctx)
    const call = await requireLiveCall(ctx, callId, user._id)
    await markJoined(ctx, call, user._id)
    return { callId, kind: call.kind }
  },
})

export const decline = mutation({
  args: { callId: v.id('calls') },
  handler: async (ctx, { callId }) => {
    const user = await requireUser(ctx)
    const row = await participant(ctx, callId, user._id)
    if (!row || row.state !== 'ringing') return null
    await ctx.db.patch('callParticipants', row._id, { state: 'declined' })
    await settle(ctx, callId)
    return null
  },
})

export const leave = mutation({
  args: { callId: v.id('calls') },
  handler: async (ctx, { callId }) => {
    const user = await requireUser(ctx)
    const row = await participant(ctx, callId, user._id)
    if (!row || row.state !== 'joined') return null
    await ctx.db.patch('callParticipants', row._id, { state: 'left' })
    await settle(ctx, callId)
    return null
  },
})

export const ringTimeout = internalMutation({
  args: { callId: v.id('calls') },
  handler: async (ctx, { callId }) => {
    const call = await ctx.db.get('calls', callId)
    if (!call || call.status === 'ended') return null
    for (const row of await participantsOf(ctx, callId)) {
      if (row.state === 'ringing') await ctx.db.patch('callParticipants', row._id, { state: 'missed' })
    }
    await settle(ctx, callId)
    return null
  },
})

export const incoming = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)
    if (!user) return []
    const rows = await ctx.db
      .query('callParticipants')
      .withIndex('by_userId_and_state', (q) => q.eq('userId', user._id).eq('state', 'ringing'))
      .take(5)
    const results = []
    for (const row of rows) {
      const call = await ctx.db.get('calls', row.callId)
      if (!call || call.status === 'ended') continue
      const conversation = await ctx.db.get('conversations', call.conversationId)
      const caller = await ctx.db.get('users', call.startedBy)
      if (!conversation || !caller) continue
      results.push({
        callId: call._id,
        kind: call.kind,
        conversationId: conversation._id,
        group: conversation.kind === 'group',
        chatName: conversation.kind === 'group' ? conversation.name ?? 'Group' : caller.name,
        callerId: caller._id,
        callerName: caller.name,
        callerImage: caller.imageUrl ?? null,
        startedAt: call.startedAt,
      })
    }
    return results
  },
})

export const activeIn = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, { conversationId }) => {
    const user = await getCurrentUser(ctx)
    if (!user || !(await getMembership(ctx, conversationId, user._id))) return null
    const call = await liveCallIn(ctx, conversationId)
    if (!call) return null
    const rows = await participantsOf(ctx, call._id)
    return {
      callId: call._id,
      kind: call.kind,
      status: call.status,
      startedAt: call.startedAt,
      answeredAt: call.answeredAt ?? null,
      joinedCount: rows.filter((row) => row.state === 'joined').length,
      myState: rows.find((row) => row.userId === user._id)?.state ?? null,
    }
  },
})

export const tokenContext = internalQuery({
  args: { callId: v.id('calls'), tokenIdentifier: v.string() },
  handler: async (ctx, { callId, tokenIdentifier }) => {
    const user = await ctx.db.query('users').withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', tokenIdentifier)).unique()
    if (!user) return null
    const call = await ctx.db.get('calls', callId)
    if (!call || call.status === 'ended') return null
    if (!(await getMembership(ctx, call.conversationId, user._id))) return null
    const row = await participant(ctx, callId, user._id)
    if (row?.state !== 'joined') return null
    return { userId: user._id, name: user.name, imageUrl: user.imageUrl ?? null }
  },
})

export const token = action({
  args: { callId: v.id('calls') },
  handler: async (ctx, { callId }): Promise<{ token: string; url: string }> => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new ConvexError('Sign in to continue.')
    const url = env.LIVEKIT_URL
    const apiKey = env.LIVEKIT_API_KEY
    const apiSecret = env.LIVEKIT_API_SECRET
    if (!url || !apiKey || !apiSecret) throw notConfigured()
    const person = await ctx.runQuery(internal.calls.tokenContext, { callId, tokenIdentifier: identity.tokenIdentifier })
    if (!person) throw callEnded()

    const accessToken = new AccessToken(apiKey, apiSecret, {
      identity: person.userId,
      name: person.name,
      metadata: JSON.stringify({ imageUrl: person.imageUrl }),
      ttl: TOKEN_TTL,
    })
    accessToken.addGrant({ room: callId, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true })
    return { token: await accessToken.toJwt(), url }
  },
})

export const participantLeft = internalMutation({
  args: { room: v.string(), identity: v.string() },
  handler: async (ctx, { room, identity }) => {
    const callId = ctx.db.normalizeId('calls', room)
    const userId = ctx.db.normalizeId('users', identity)
    if (!callId || !userId) return null
    const row = await participant(ctx, callId, userId)
    if (row?.state === 'joined') await ctx.db.patch('callParticipants', row._id, { state: 'left' })
    await settle(ctx, callId)
    return null
  },
})

export const roomFinished = internalMutation({
  args: { room: v.string() },
  handler: async (ctx, { room }) => {
    const callId = ctx.db.normalizeId('calls', room)
    const call = callId ? await ctx.db.get('calls', callId) : null
    if (!call || call.status === 'ended') return null
    await endCall(ctx, call, call.answeredAt ? 'ended' : 'missed')
    return null
  },
})
