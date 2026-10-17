import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getCurrentUser, normalizePin, requireUser } from './lib/auth'
import { isSupportedLanguage } from './lib/languages'

const PIN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomPin() {
  let code = ''
  for (let i = 0; i < 4; i++) code += PIN_ALPHABET[Math.floor(Math.random() * PIN_ALPHABET.length)]
  return `AFJ-${code}`
}

export const store = mutation({
  args: { name: v.optional(v.string()), imageUrl: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new ConvexError('Sign in to continue.')
    const name = (identity.name ?? args.name ?? identity.nickname ?? identity.email ?? 'afjini member').trim().slice(0, 80)
    const imageUrl = identity.pictureUrl ?? args.imageUrl

    const existing = await getCurrentUser(ctx)
    if (existing) {
      if (existing.name !== name || existing.imageUrl !== imageUrl) await ctx.db.patch('users', existing._id, { name, imageUrl })
      return existing._id
    }

    for (let attempt = 0; attempt < 25; attempt++) {
      const pin = randomPin()
      const taken = await ctx.db.query('users').withIndex('by_pin', (q) => q.eq('pin', pin)).unique()
      if (!taken) {
        return await ctx.db.insert('users', { tokenIdentifier: identity.tokenIdentifier, name, imageUrl, pin, language: 'English' })
      }
    }
    throw new ConvexError('Could not assign a PIN. Please try again.')
  },
})

export const me = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx)
  },
})

export const setLanguage = mutation({
  args: { language: v.string() },
  handler: async (ctx, { language }) => {
    const user = await requireUser(ctx)
    if (!isSupportedLanguage(language)) throw new ConvexError('That language is not supported yet.')
    await ctx.db.patch('users', user._id, { language })
    return null
  },
})

export const findByPin = query({
  args: { pin: v.string() },
  handler: async (ctx, args) => {
    const viewer = await requireUser(ctx)
    const pin = normalizePin(args.pin)
    if (!pin) return null
    const user = await ctx.db.query('users').withIndex('by_pin', (q) => q.eq('pin', pin)).unique()
    if (!user) return null
    return { _id: user._id, name: user.name, imageUrl: user.imageUrl, pin: user.pin, language: user.language, isSelf: user._id === viewer._id }
  },
})
