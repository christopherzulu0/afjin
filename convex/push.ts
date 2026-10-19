'use node'

import { v } from 'convex/values'
import webpush from 'web-push'
import { internal } from './_generated/api'
import { env, internalAction, type ActionCtx } from './_generated/server'

type Target = { endpoint: string; p256dh: string; auth: string; payload: string }

function configure() {
  const publicKey = env.VAPID_PUBLIC_KEY
  const privateKey = env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails(env.VAPID_SUBJECT ?? 'mailto:hello@afjini.app', publicKey, privateKey)
  return true
}

async function deliver(ctx: ActionCtx, targets: Target[], ttlSeconds: number) {
  for (const target of targets) {
    try {
      await webpush.sendNotification({ endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } }, target.payload, { TTL: ttlSeconds })
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode
      if (statusCode === 404 || statusCode === 410) {
        await ctx.runMutation(internal.pushSubscriptions.deleteEndpoint, { endpoint: target.endpoint })
      } else {
        // Push is best-effort: log and keep going so one bad endpoint doesn't block the rest.
        console.warn(`Push to subscription failed with status ${statusCode ?? 'unknown'}`)
      }
    }
  }
}

export const notifyMessage = internalAction({
  args: { messageId: v.id('messages') },
  handler: async (ctx, { messageId }) => {
    if (!configure()) return null
    await deliver(ctx, await ctx.runQuery(internal.pushSubscriptions.targetsForMessage, { messageId }), 3600)
    return null
  },
})

export const notifyCall = internalAction({
  args: { callId: v.id('calls') },
  handler: async (ctx, { callId }) => {
    if (!configure()) return null
    await deliver(ctx, await ctx.runQuery(internal.pushSubscriptions.targetsForCall, { callId }), 45)
    return null
  },
})
