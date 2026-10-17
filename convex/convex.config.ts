import { defineApp } from 'convex/server'
import { v } from 'convex/values'
import presence from '@convex-dev/presence/convex.config.js'
import rateLimiter from '@convex-dev/rate-limiter/convex.config.js'
import workpool from '@convex-dev/workpool/convex.config.js'

const app = defineApp({
  env: {
    DEEPL_API_KEY: v.optional(v.string()),
    VAPID_PUBLIC_KEY: v.optional(v.string()),
    VAPID_PRIVATE_KEY: v.optional(v.string()),
    VAPID_SUBJECT: v.optional(v.string()),
  },
})

app.use(presence)
app.use(rateLimiter)
app.use(workpool, { name: 'translationWorkpool' })
app.use(workpool, { name: 'pushWorkpool' })

export default app
