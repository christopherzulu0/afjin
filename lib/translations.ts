type Phrase = Record<string, string>

export const samplePhrases = ['Hello, how are you today?', 'I saved you a seat.', 'Let’s talk soon.']

const phrasebook: Phrase[] = [
  {
    English: 'Hello, how are you today?',
    Spanish: 'Hola, ¿cómo estás hoy?',
    French: 'Bonjour, comment allez-vous aujourd’hui ?',
    German: 'Hallo, wie geht es dir heute?',
    Portuguese: 'Olá, como você está hoje?',
    Italian: 'Ciao, come stai oggi?',
    Japanese: 'こんにちは、今日はお元気ですか？',
    Arabic: 'مرحبًا، كيف حالك اليوم؟',
    Hindi: 'नमस्ते, आज आप कैसे हैं?',
  },
  {
    English: 'I saved you a seat.',
    Spanish: 'Te guardé un asiento.',
    French: 'Je vous ai gardé une place.',
    German: 'Ich habe dir einen Platz freigehalten.',
    Portuguese: 'Guardei um lugar para você.',
    Italian: 'Ti ho tenuto un posto.',
    Japanese: '席を取っておきました。',
    Arabic: 'لقد حفظت لك مقعدًا.',
    Hindi: 'मैंने आपके लिए एक सीट रखी है।',
  },
  {
    English: 'Let’s talk soon.',
    Spanish: 'Hablemos pronto.',
    French: 'Parlons bientôt.',
    German: 'Lass uns bald sprechen.',
    Portuguese: 'Vamos conversar em breve.',
    Italian: 'Parliamo presto.',
    Japanese: 'また近いうちに話しましょう。',
    Arabic: 'لنتحدث قريبًا.',
    Hindi: 'जल्द ही बात करते हैं।',
  },
  {
    English: 'Thank you!',
    Spanish: '¡Gracias!',
    French: 'Merci !',
    German: 'Danke!',
    Portuguese: 'Obrigado!',
    Italian: 'Grazie!',
    Japanese: 'ありがとう！',
    Arabic: 'شكرًا!',
    Hindi: 'धन्यवाद!',
  },
  {
    English: 'See you soon!',
    Spanish: '¡Hasta pronto!',
    French: 'À bientôt !',
    German: 'Bis bald!',
    Portuguese: 'Até logo!',
    Italian: 'A presto!',
    Japanese: 'またね！',
    Arabic: 'أراك قريبًا!',
    Hindi: 'जल्द मिलते हैं!',
  },
  {
    English: 'Good morning!',
    Spanish: '¡Buenos días!',
    French: 'Bonjour !',
    German: 'Guten Morgen!',
    Portuguese: 'Bom dia!',
    Italian: 'Buongiorno!',
    Japanese: 'おはようございます！',
    Arabic: 'صباح الخير!',
    Hindi: 'सुप्रभात!',
  },
  {
    English: 'I miss you.',
    Spanish: 'Te extraño.',
    French: 'Tu me manques.',
    German: 'Ich vermisse dich.',
    Portuguese: 'Sinto sua falta.',
    Italian: 'Mi manchi.',
    Japanese: '会いたいです。',
    Arabic: 'اشتقت إليك.',
    Hindi: 'मुझे तुम्हारी याद आती है।',
  },
]

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[\s.!?¡¿。！？]+/g, ' ')
    .trim()
}

export function lookupTranslation(text: string, from: string, to: string) {
  const needle = normalize(text)
  if (!needle) return undefined
  const phrase = phrasebook.find((entry) => entry[from] && normalize(entry[from]) === needle)
  return phrase?.[to]
}
