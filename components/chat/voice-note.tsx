'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import type { Attachment } from '@/lib/chat-data'
import { formatDuration } from '@/lib/chat-format'

export function VoiceNote({ attachment }: { attachment: Attachment }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const duration = attachment.duration ?? 0

  useEffect(() => {
    const audio = audioRef.current
    return () => audio?.pause()
  }, [])

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      void audio.play()
    } else {
      audio.pause()
    }
  }

  return (
    <div className={`voice-note ${attachment.url ? '' : 'is-unavailable'}`}>
      <button
        type="button"
        className="voice-play"
        onClick={toggle}
        disabled={!attachment.url}
        aria-label={playing ? 'Pause voice message' : 'Play voice message'}
        title={attachment.url ? undefined : 'Still sending…'}
      >
        {playing ? <Pause /> : <Play />}
      </button>
      <div className="voice-track" aria-hidden>
        <span style={{ width: `${progress * 100}%` }} />
      </div>
      <span className="voice-time">{formatDuration(playing || elapsed ? elapsed : duration)}</span>
      {attachment.url && (
        <audio
          ref={audioRef}
          src={attachment.url}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false)
            setProgress(0)
            setElapsed(0)
          }}
          onTimeUpdate={(event) => {
            const audio = event.currentTarget
            const total = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : duration
            setElapsed(audio.currentTime)
            setProgress(total ? Math.min(1, audio.currentTime / total) : 0)
          }}
        />
      )}
    </div>
  )
}
