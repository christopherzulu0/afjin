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
