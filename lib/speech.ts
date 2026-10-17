export const languages = ['English', 'Spanish', 'French', 'Portuguese', 'German', 'Italian', 'Japanese', 'Arabic', 'Hindi']

export const speechLang: Record<string, string> = {
  English: 'en-US',
  Spanish: 'es-ES',
  French: 'fr-FR',
  German: 'de-DE',
  Portuguese: 'pt-BR',
  Italian: 'it-IT',
  Japanese: 'ja-JP',
  Arabic: 'ar-SA',
  Hindi: 'hi-IN',
}

export const rtlLanguages = new Set(['Arabic'])

export function languageCode(language: string) {
  return speechLang[language] ?? 'en-US'
}

export function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function speak(text: string, language: string) {
  if (!text.trim() || !canSpeak()) return false
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = languageCode(language)
  window.speechSynthesis.speak(utterance)
  return true
}
