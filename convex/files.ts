import { mutation } from './_generated/server'
import { requireUser } from './lib/auth'
import { rateLimiter } from './lib/limits'

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    await rateLimiter.limit(ctx, 'generateUploadUrl', { key: user._id, throws: true })
    return await ctx.storage.generateUploadUrl()
  },
})
