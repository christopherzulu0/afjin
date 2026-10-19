'use client'

import '@livekit/components-styles'
import { useEffect, useRef, useState } from 'react'
import {
  DisconnectButton,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  StartAudio,
  TrackToggle,
  useIsSpeaking,
  useMediaDeviceSelect,
  useParticipants,
  useTracks,
} from '@livekit/components-react'
import { MediaDeviceFailure, Track, type Participant } from 'livekit-client'
import { Loader2, Maximize2, MicOff, Minimize2, PhoneOff, SwitchCamera } from 'lucide-react'
import { errorMessage } from '@/hooks/use-convex-chat'
import { useCallActions, useCallInChat, type CurrentCall } from '@/hooks/use-calls'
import { useStableCallback } from '@/hooks/use-stable-callback'
import { colorFor, initialsFor } from '@/lib/chat-data'
import { Avatar } from './avatar'

export type CallEndReason = 'hangup' | 'ended' | 'error'

type CallScreenProps = {
  call: CurrentCall
  minimized: boolean
  onMinimizedChange: (minimized: boolean) => void
  onEnded: (callId: string, reason: CallEndReason, message?: string) => void
  onMediaError: (title: string, message: string) => void
}

function mediaFailureMessage(failure: MediaDeviceFailure | undefined, kind: MediaDeviceKind | undefined) {
  const device = kind === 'videoinput' ? 'camera' : 'microphone'
  if (failure === MediaDeviceFailure.PermissionDenied) {
    return `afjini isn’t allowed to use your ${device}. Allow ${device} access for this site from the icon in your browser’s address bar, then turn it back on in the call.`
  }
  if (failure === MediaDeviceFailure.NotFound) return `No ${device} was found. Connect one or check your system settings, then turn it back on in the call.`
  if (failure === MediaDeviceFailure.DeviceInUse) return `Your ${device} is being used by another app. Close that app and turn it back on in the call.`
  return `Your ${device} couldn’t be started. Check your browser and system settings.`
}

function useElapsed(since: number | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!since) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [since])
  if (!since) return null
  const seconds = Math.max(0, Math.floor((now - since) / 1000))
  const hours = Math.floor(seconds / 3600)
  const clock = `${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  return hours ? `${hours}:${clock}` : clock
}

export default function CallScreen({ call, minimized, onMinimizedChange, onEnded, onMediaError }: CallScreenProps) {
  const actions = useCallActions()
  const status = useCallInChat(call.conversationId)
  const [grant, setGrant] = useState<{ token: string; url: string } | null>(null)
  const finished = useRef(false)
  const elapsed = useElapsed(status?.callId === call.callId ? status.answeredAt : null)

  const finish = useStableCallback((reason: CallEndReason, message?: string) => {
    if (finished.current) return
    finished.current = true
    void actions.leave({ callId: call.callId }).catch(() => undefined)
    onEnded(call.callId, reason, message)
  })
  const fetchToken = actions.token

  useEffect(() => {
    let cancelled = false
    fetchToken({ callId: call.callId })
      .then((result) => { if (!cancelled) setGrant(result) })
      .catch((error: unknown) => { if (!cancelled) finish('error', errorMessage(error, 'The call couldn’t connect. Try again.')) })
    return () => { cancelled = true }
  }, [call.callId, fetchToken, finish])

  useEffect(() => {
    if (status === undefined) return
    if (status === null || status.callId !== call.callId || status.myState === 'left') finish('ended')
  }, [status, call.callId, finish])

  const ringing = status?.callId === call.callId && status.status === 'ringing'
  const label = !grant ? 'Connecting…' : ringing ? 'Ringing…' : elapsed ?? 'Connected'

  return (
    <section className={`call-screen ${minimized ? 'is-minimized' : ''}`} aria-label={`${call.kind === 'video' ? 'Video' : 'Voice'} call with ${call.chatName}`}>
      {grant ? (
        <LiveKitRoom
          serverUrl={grant.url}
          token={grant.token}
          connect
          audio
          video={call.kind === 'video'}
          options={{ adaptiveStream: true, dynacast: true, disconnectOnPageLeave: true }}
          onDisconnected={() => finish('hangup')}
          onError={() => finish('error', 'The call connection dropped. Try calling again.')}
          onMediaDeviceFailure={(failure, kind) => onMediaError(kind === 'videoinput' ? 'Camera unavailable' : 'Microphone unavailable', mediaFailureMessage(failure, kind))}
          className="call-room"
          data-lk-theme="default"
        >
          <CallHeader chatName={call.chatName} label={label} minimized={minimized} onMinimizedChange={onMinimizedChange} />
          {!minimized && <CallStage kind={call.kind} />}
          <RoomAudioRenderer />
          <StartAudio label="Tap to hear the call" className="call-start-audio" />
          <div className="call-controls">
            <TrackToggle source={Track.Source.Microphone} className="call-control" aria-label="Microphone" />
            <TrackToggle source={Track.Source.Camera} className="call-control" aria-label="Camera" />
            {!minimized && <ScreenShareToggle />}
            {!minimized && <FlipCamera />}
            <DisconnectButton className="call-control is-hangup" aria-label="Hang up"><PhoneOff /></DisconnectButton>
          </div>
        </LiveKitRoom>
      ) : (
        <div className="call-room">
          <CallHeader chatName={call.chatName} label={label} minimized={minimized} onMinimizedChange={onMinimizedChange} />
          {!minimized && <div className="call-connecting"><Loader2 className="spin" /> Connecting securely…</div>}
          <div className="call-controls">
            <button type="button" className="call-control is-hangup" aria-label="Cancel call" onClick={() => finish('hangup')}><PhoneOff /></button>
          </div>
        </div>
      )}
    </section>
  )
}

function CallHeader({ chatName, label, minimized, onMinimizedChange }: { chatName: string; label: string; minimized: boolean; onMinimizedChange: (minimized: boolean) => void }) {
  return (
    <header className="call-header">
      <span className="call-title">
        <strong>{chatName}</strong>
        <small aria-live="polite">{label}</small>
      </span>
      <button type="button" className="call-control is-ghost" aria-label={minimized ? 'Expand call' : 'Minimise call'} onClick={() => onMinimizedChange(!minimized)}>
        {minimized ? <Maximize2 /> : <Minimize2 />}
      </button>
    </header>
  )
}

function CallStage({ kind }: { kind: 'voice' | 'video' }) {
  const participants = useParticipants()
  const showVideo = kind === 'video' || participants.some((participant) => participant.isCameraEnabled || participant.isScreenShareEnabled)
  return showVideo ? <VideoStage /> : <VoiceStage participants={participants} />
}

function VideoStage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  )
  return (
    <GridLayout tracks={tracks} className="call-grid">
      <ParticipantTile />
    </GridLayout>
  )
}

function VoiceStage({ participants }: { participants: Participant[] }) {
  return (
    <div className={`call-voice ${participants.length > 2 ? 'is-group' : ''}`}>
      {participants.map((participant) => <VoiceTile key={participant.identity} participant={participant} />)}
      {participants.length < 2 && <p className="call-waiting">Waiting for others to join…</p>}
    </div>
  )
}

function VoiceTile({ participant }: { participant: Participant }) {
  const speaking = useIsSpeaking(participant)
  const name = participant.name || 'Guest'
  let imageUrl: string | null = null
  try {
    imageUrl = (JSON.parse(participant.metadata || '{}') as { imageUrl?: string | null }).imageUrl ?? null
  } catch {}
  return (
    <div className={`call-voice-tile ${speaking ? 'is-speaking' : ''}`}>
      <Avatar initials={initialsFor(name)} color={colorFor(participant.identity)} imageUrl={imageUrl} />
      <span>{participant.isLocal ? 'You' : name}{!participant.isMicrophoneEnabled && <MicOff aria-label="Muted" />}</span>
    </div>
  )
}

function ScreenShareToggle() {
  const supported = typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getDisplayMedia === 'function'
  if (!supported) return null
  return <TrackToggle source={Track.Source.ScreenShare} className="call-control is-wide-only" aria-label="Share screen" captureOptions={{ audio: true }} />
}

function FlipCamera() {
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind: 'videoinput' })
  if (devices.length < 2) return null
  function flip() {
    const index = devices.findIndex((device) => device.deviceId === activeDeviceId)
    void setActiveMediaDevice(devices[(index + 1) % devices.length].deviceId)
  }
  return (
    <button type="button" className="call-control" aria-label="Switch camera" onClick={flip}><SwitchCamera /></button>
  )
}
