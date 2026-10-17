'use node'

import { v } from 'convex/values'
import webpush from 'web-push'
import { internal } from './_generated/api'
import { env, internalAction } from './_generated/server'

export const notifyMessage = internalAction({
  args: { messageId: v.id('messages') },
  handler: async (ctx, { messageId }) => {
    const publicKey = env.VAPID_PUBLIC_KEY
    const privateKey = env.VAPID_PRIVATE_KEY
    if (!publicKey || !privateKey) return null
    webpush.setVapidDetails(env.VAPID_SUBJECT ?? 'mailto:hello@afjini.app', publicKey, privateKey)

    const targets = await ctx.runQuery(internal.pushSubscriptions.targetsForMessage, { messageId })
    for (const target of targets) {
      try {
        await webpush.sendNotification({ endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } }, target.payload, { TTL: 3600 })
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
    return null
  },
})
