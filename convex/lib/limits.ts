import { HOUR, MINUTE, RateLimiter } from '@convex-dev/rate-limiter'
import { Workpool } from '@convex-dev/workpool'
import { components } from '../_generated/api'

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  sendMessage: { kind: 'token bucket', rate: 30, period: MINUTE, capacity: 10 },
  editMessage: { kind: 'token bucket', rate: 30, period: MINUTE, capacity: 10 },
  generateUploadUrl: { kind: 'token bucket', rate: 20, period: MINUTE, capacity: 6 },
  startConversation: { kind: 'token bucket', rate: 30, period: HOUR, capacity: 10 },
})

export const translationPool = new Workpool(components.translationWorkpool, {
  maxParallelism: 5,
  retryActionsByDefault: true,
  defaultRetryBehavior: { maxAttempts: 4, initialBackoffMs: 1000, base: 2 },
})

export const pushPool = new Workpool(components.pushWorkpool, {
  maxParallelism: 5,
  retryActionsByDefault: true,
  defaultRetryBehavior: { maxAttempts: 3, initialBackoffMs: 2000, base: 2 },
})
