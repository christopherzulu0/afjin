const THROTTLE_MS = 1500
const NOTES = [
  { frequency: 1318.5, start: 0, duration: 0.2 },
  { frequency: 1760, start: 0.15, duration: 0.3 },
]
const VOLUME = 0.25
const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const

export type ChimeResult = 'played' | 'locked' | 'throttled' | 'unsupported'

type SoundState = { context: AudioContext | null; lastPlayedAt: number; unlockListening: boolean; listeners: Set<() => void> }

// Kept on globalThis so a hot reload in development doesn't drop an already-unlocked context.
const state: SoundState = ((globalThis as { __afjiniSound?: SoundState }).__afjiniSound ??= {
  context: null,
  lastPlayedAt: 0,
  unlockListening: false,
  listeners: new Set(),
})

function notifyUnlocked() {
  state.listeners.forEach((listener) => listener())
}

export function subscribeAudioUnlock(listener: () => void) {
  state.listeners.add(listener)
  return () => {
    state.listeners.delete(listener)
  }
}

function getContext() {
  if (typeof window === 'undefined') return null
  if (!state.context) {
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return null
    state.context = new AudioCtor()
  }
  return state.context
}

export function isAudioUnlocked() {
  return state.context?.state === 'running'
}

// Browsers keep audio suspended until the user interacts with the page,
// so keep listening until a gesture actually gets the context running.
export function listenForAudioUnlock() {
  if (typeof window === 'undefined' || state.unlockListening || isAudioUnlocked()) return
  state.unlockListening = true
  const unlock = () => {
    const audio = getContext()
    if (!audio) return
    void audio.resume().then(() => {
      if (audio.state !== 'running') return
      UNLOCK_EVENTS.forEach((type) => window.removeEventListener(type, unlock, true))
      state.unlockListening = false
      notifyUnlocked()
    }).catch(() => undefined)
  }
  UNLOCK_EVENTS.forEach((type) => window.addEventListener(type, unlock, true))
}

export async function previewChime() {
  const audio = getContext()
  if (!audio) return 'unsupported' as const
  await audio.resume().catch(() => undefined)
  if (audio.state === 'running') notifyUnlocked()
  state.lastPlayedAt = 0
  return playChime()
}

export function playChime(): ChimeResult {
  const audio = getContext()
  if (!audio) return 'unsupported'
  if (audio.state !== 'running') return 'locked'
  const now = Date.now()
  if (now - state.lastPlayedAt < THROTTLE_MS) return 'throttled'
  if (!state.lastPlayedAt) notifyUnlocked()
  state.lastPlayedAt = now
  playNotes(audio, NOTES, VOLUME)
  return 'played'
}

const RING_NOTES = [
  { frequency: 880, start: 0, duration: 0.32 },
  { frequency: 660, start: 0.38, duration: 0.42 },
  { frequency: 880, start: 1.0, duration: 0.32 },
  { frequency: 660, start: 1.38, duration: 0.42 },
]
const RING_INTERVAL_MS = 3200
const RING_VOLUME = 0.2

/** Loops an incoming-call ring until the returned stop function is called. Silent while audio is still locked. */
export function startRingtone() {
  const audio = getContext()
  if (!audio || typeof window === 'undefined') return () => undefined
  const ring = () => {
    if (audio.state === 'running') playNotes(audio, RING_NOTES, RING_VOLUME)
  }
  ring()
  const timer = window.setInterval(ring, RING_INTERVAL_MS)
  return () => window.clearInterval(timer)
}

function playNotes(audio: AudioContext, notes: { frequency: number; start: number; duration: number }[], volume: number) {
  const start = audio.currentTime
  for (const note of notes) {
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = note.frequency
    const noteStart = start + note.start
    const noteEnd = noteStart + note.duration
    gain.gain.setValueAtTime(0, noteStart)
    gain.gain.linearRampToValueAtTime(volume, noteStart + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd)
    oscillator.connect(gain).connect(audio.destination)
    oscillator.start(noteStart)
    oscillator.stop(noteEnd + 0.02)
  }
}
