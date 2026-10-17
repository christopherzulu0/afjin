import { v } from 'convex/values'
import { internal } from './_generated/api'
import { env, internalAction } from './_generated/server'
import { deeplTarget } from './lib/languages'

function deeplEndpoint(key: string) {
  return key.endsWith(':fx') ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate'
}

export const translateMessage = internalAction({
  args: { messageId: v.id('messages') },
  handler: async (ctx, { messageId }) => {
    const job = await ctx.runQuery(internal.translations.getJob, { messageId })
    if (!job || !job.languages.length) return null
    const key = env.DEEPL_API_KEY

    for (const language of job.languages) {
      const target = deeplTarget(language)
      const save = (status: 'done' | 'unsupported' | 'failed', text?: string) =>
        ctx.runMutation(internal.translations.save, { messageId, language, version: job.version, status, text })

      if (!key) {
        console.warn('DEEPL_API_KEY is not set; skipping translation.')
        await save('failed')
        continue
      }
      if (!target) {
        await save('unsupported')
        continue
      }

      const response = await fetch(deeplEndpoint(key), {
        method: 'POST',
        headers: { Authorization: `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: [job.body], target_lang: target }),
      })
      const traceId = response.headers.get('x-trace-id')

      // 429 and 5xx are transient: throw so the workpool retries with backoff.
      if (response.status === 429 || response.status >= 500) {
        throw new Error(`DeepL returned ${response.status} (trace ${traceId})`)
      }
      if (!response.ok) {
        console.warn(`DeepL returned ${response.status} for ${language} (trace ${traceId})`)
        await save(response.status === 400 ? 'unsupported' : 'failed')
        continue
      }

      const data = (await response.json()) as { translations?: { text?: string }[] }
      const text = data.translations?.[0]?.text
      await save(text ? 'done' : 'failed', text)
    }
    return null
  },
})
