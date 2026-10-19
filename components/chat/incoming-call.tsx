'use client'

import { useEffect, useId } from 'react'
import { Phone, PhoneOff, Video } from 'lucide-react'
import type { IncomingCall } from '@/hooks/use-calls'
import { colorFor, initialsFor } from '@/lib/chat-data'
import { startRingtone } from '@/lib/sounds'
import { Avatar } from './avatar'

type IncomingCallBannerProps = {
  call: IncomingCall
  ring: boolean
  onAccept: () => void
  onDecline: () => void
}

export function IncomingCallBanner({ call, ring, onAccept, onDecline }: IncomingCallBannerProps) {
  const titleId = useId()

  useEffect(() => {
    if (!ring) return
    return startRingtone()
  }, [ring, call.callId])

  const kind = call.kind === 'video' ? 'video' : 'voice'
  return (
    <section className="incoming-call" role="dialog" aria-modal="false" aria-labelledby={titleId}>
      <span className="incoming-call-avatar">
        <Avatar initials={initialsFor(call.callerName)} color={colorFor(call.callerId)} imageUrl={call.callerImage} />
      </span>
      <span className="incoming-call-copy">
        <strong id={titleId}>{call.group ? call.chatName : call.callerName}</strong>
        <small>{call.group ? `${call.callerName} started a ${kind} call` : `Incoming ${kind} call`}</small>
      </span>
      <button type="button" className="call-control is-hangup" aria-label="Decline call" onClick={onDecline}><PhoneOff /></button>
      <button type="button" className="call-control is-accept" aria-label={`Accept ${kind} call`} onClick={onAccept} data-autofocus>
        {call.kind === 'video' ? <Video /> : <Phone />}
      </button>
    </section>
  )
}
