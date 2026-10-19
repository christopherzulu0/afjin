export const supportedLanguages = ['English', 'Spanish', 'French', 'Portuguese', 'German', 'Italian', 'Japanese', 'Arabic', 'Hindi'] as const

const deeplTargets: Record<string, string> = {
  English: 'EN-US',
  Spanish: 'ES',
  French: 'FR',
  Portuguese: 'PT-BR',
  German: 'DE',
  Italian: 'IT',
  Japanese: 'JA',
  Arabic: 'AR',
  Hindi: 'HI',
}

const deeplSources: Record<string, string> = {
  English: 'EN',
  Spanish: 'ES',
  French: 'FR',
  Portuguese: 'PT',
  German: 'DE',
  Italian: 'IT',
  Japanese: 'JA',
  Arabic: 'AR',
  Hindi: 'HI',
}

export function isSupportedLanguage(language: string) {
  return (supportedLanguages as readonly string[]).includes(language)
}

export function deeplTarget(language: string) {
  return deeplTargets[language]
}

export function deeplSource(language: string) {
  return deeplSources[language]
}

const SHORT_TEXT_WORDS = 2

export function deeplRequestBody(body: string, profileLanguage: string, targetLanguage: string) {
  const request: { text: string[]; target_lang: string; source_lang?: string } = { text: [body], target_lang: deeplTarget(targetLanguage) }
  const words = body.trim().split(/\s+/).filter(Boolean).length
  const source = deeplSource(profileLanguage)
  // DeepL's detection is unreliable for a word or two ("hi" came back as "Nous sommes"),
  // so only very short texts fall back to the sender's profile language.
  if (words <= SHORT_TEXT_WORDS && source) request.source_lang = source
  return request
}

export function languageFromDeepl(code: string | undefined) {
  if (!code) return undefined
  const base = code.toUpperCase().split('-')[0]
  return Object.entries(deeplSources).find(([, value]) => value === base)?.[0]
}
