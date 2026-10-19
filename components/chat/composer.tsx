'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { Check, FileText, Globe2, Image as ImageIcon, Mic, Paperclip, Pencil, Reply, RotateCcw, Send, Smile, Square, Trash2, X } from 'lucide-react'
import { uid, type AttachmentKind, type Conversation, type Message } from '@/lib/chat-data'
import { firstName, formatBytes, formatDuration, messageSummary } from '@/lib/chat-format'
import { useDismiss } from '@/hooks/use-dismiss'
import { EmojiPicker } from './emoji-picker'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_ATTACHMENTS = 6
const MAX_RECORDING_SECONDS = 120
const MAX_TEXTAREA_HEIGHT = 132

export type ComposerContext = { type: 'reply' | 'edit'; message: Message } | null

export type OutgoingAttachment = { storageId: string; kind: AttachmentKind; name: string; size: number; duration?: number; previewUrl: string }

type Upload = {
  id: string
  kind: AttachmentKind
  name: string
  size: number
  duration?: number
  file: Blob
  previewUrl: string
  status: 'uploading' | 'done' | 'error'
  progress: number
  storageId?: string
}

type ComposerProps = {
  chat: Conversation
  myLanguage: string
  initialDraft: string
  context: ComposerContext
  textareaRef: RefObject<HTMLTextAreaElement | null>
  getUploadUrl: () => Promise<string>
  onDraftChange: (text: string) => void
  onCancelContext: () => void
  onSend: (payload: { text: string; attachments: OutgoingAttachment[] }) => Promise<boolean>
  onTyping: () => void
  onEditLast: () => void
  notify: (text: string) => void
}

function uploadBlob(url: string, file: Blob, onProgress: (fraction: number) => void) {
  return new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', url)
    request.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total)
    }
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) return reject(new Error(`Upload failed (${request.status})`))
      try {
        resolve((JSON.parse(request.responseText) as { storageId: string }).storageId)
      } catch {
        reject(new Error('Upload response was not understood'))
      }
    }
    request.onerror = () => reject(new Error('Network error during upload'))
    request.send(file)
  })
}

function toOutgoing(upload: Upload): OutgoingAttachment {
  return { storageId: upload.storageId!, kind: upload.kind, name: upload.name, size: upload.size, duration: upload.duration, previewUrl: upload.previewUrl }
}

export function Composer({
  chat,
  myLanguage,
  initialDraft,
  context,
  textareaRef,
  getUploadUrl,
  onDraftChange,
  onCancelContext,
  onSend,
  onTyping,
  onEditLast,
  notify,
}: ComposerProps) {
  const [text, setText] = useState(initialDraft)
  const [uploads, setUploads] = useState<Upload[]>([])
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const sendRecordingRef = useRef(false)
  const secondsRef = useRef(0)
  const onSendRef = useRef(onSend)
  const closeEmoji = useCallback(() => setEmojiOpen(false), [])
  useDismiss(emojiRef, emojiOpen, closeEmoji)

  const editing = context?.type === 'edit'
  const uploading = uploads.some((upload) => upload.status === 'uploading')
  const failed = uploads.some((upload) => upload.status === 'error')
  const ready = uploads.filter((upload) => upload.status === 'done')
  const canSend = editing ? Boolean(text.trim()) : Boolean(text.trim() || ready.length) && !uploading && !failed

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`
    textarea.style.overflowY = textarea.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden'
  }, [text, textareaRef, recording])

  useEffect(() => {
    if (!context) return
    if (context.type === 'edit') updateText(context.message.text)
    textareaRef.current?.focus()
    // Only react to a new reply or edit target.
  }, [context?.type, context?.message.id])

  useEffect(() => {
    onSendRef.current = onSend
  }, [onSend])

  useEffect(() => () => stopStream(), [])

  function updateText(value: string) {
    setText(value)
    onDraftChange(value)
  }

  function stopStream() {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  function patchUpload(id: string, patch: Partial<Upload>) {
    setUploads((current) => current.map((upload) => (upload.id === id ? { ...upload, ...patch } : upload)))
  }

  async function runUpload(upload: Upload) {
    patchUpload(upload.id, { status: 'uploading', progress: 0 })
    try {
      const url = await getUploadUrl()
      const storageId = await uploadBlob(url, upload.file, (progress) => patchUpload(upload.id, { progress }))
      const done = { ...upload, status: 'done' as const, progress: 1, storageId }
      patchUpload(upload.id, done)
      return done
    } catch {
      patchUpload(upload.id, { status: 'error' })
      return null
    }
  }

  function addFiles(files: FileList | File[]) {
    const list = Array.from(files)
    if (!list.length) return
    const room = MAX_ATTACHMENTS - uploads.length
    if (room <= 0) {
      notify(`You can attach up to ${MAX_ATTACHMENTS} files at once.`)
      return
    }
    const accepted: Upload[] = []
    for (const file of list.slice(0, room)) {
      if (file.size > MAX_FILE_SIZE) {
        notify(`${file.name} is larger than 10 MB.`)
        continue
      }
      accepted.push({
        id: uid(),
        kind: file.type.startsWith('image/') ? 'image' : 'file',
        name: file.name,
        size: file.size,
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'uploading',
        progress: 0,
      })
    }
    if (list.length > room) notify(`Only the first ${room} file${room === 1 ? '' : 's'} were added.`)
    if (!accepted.length) return
    setUploads((current) => [...current, ...accepted])
    accepted.forEach((upload) => void runUpload(upload))
    textareaRef.current?.focus()
  }

  function removeUpload(id: string) {
    setUploads((current) => {
      const removed = current.find((upload) => upload.id === id)
      if (removed && removed.status !== 'done') URL.revokeObjectURL(removed.previewUrl)
      return current.filter((upload) => upload.id !== id)
    })
  }

  function insertEmoji(emoji: string) {
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? text.length
    const end = textarea?.selectionEnd ?? text.length
    updateText(text.slice(0, start) + emoji + text.slice(end))
    setEmojiOpen(false)
    window.requestAnimationFrame(() => {
      if (!textarea) return
      textarea.focus()
      const caret = start + emoji.length
      textarea.setSelectionRange(caret, caret)
    })
  }

  async function submit() {
    if (!canSend) return
    const draft = text
    const sending = editing ? [] : ready
    updateText('')
    if (!editing) setUploads((current) => current.filter((upload) => upload.status !== 'done'))
    const ok = await onSendRef.current({ text: draft.trim(), attachments: sending.map(toOutgoing) })
    if (!ok) {
      updateText(draft)
      if (sending.length) setUploads((current) => [...sending, ...current])
    }
  }

  async function sendVoiceNote(blob: Blob, duration: number) {
    const upload: Upload = {
      id: uid(),
      kind: 'audio',
      name: 'Voice message',
      size: blob.size,
      duration,
      file: blob,
      previewUrl: URL.createObjectURL(blob),
      status: 'uploading',
      progress: 0,
    }
    setUploads((current) => [...current, upload])
    const done = await runUpload(upload)
    if (!done) {
      notify('Your voice note didn’t upload. Tap retry on it to try again.')
      return
    }
    setUploads((current) => current.filter((item) => item.id !== upload.id))
    const ok = await onSendRef.current({ text: '', attachments: [toOutgoing(done)] })
    if (!ok) setUploads((current) => [...current, done])
  }

  async function startRecording() {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      notify('Voice notes aren’t supported in this browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []
      sendRecordingRef.current = false
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const duration = Math.max(1, secondsRef.current)
        stopStream()
        setRecording(false)
        if (!sendRecordingRef.current || !chunksRef.current.length) return
        const type = (recorder.mimeType || 'audio/webm').split(';')[0]
        void sendVoiceNote(new Blob(chunksRef.current, { type }), duration)
      }
      recorder.start()
      secondsRef.current = 0
      setSeconds(0)
      setRecording(true)
      timerRef.current = window.setInterval(() => {
        secondsRef.current += 1
        setSeconds(secondsRef.current)
        if (secondsRef.current >= MAX_RECORDING_SECONDS) finishRecording(true)
      }, 1000)
    } catch {
      stopStream()
      notify('Microphone access was blocked. Allow it in your browser settings to record voice notes.')
    }
  }

  function finishRecording(send: boolean) {
    sendRecordingRef.current = send
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    } else {
      stopStream()
      setRecording(false)
    }
  }

  const contextName = context ? (context.message.from === 'me' ? 'yourself' : firstName(context.message.author)) : ''
  let note = chat.translationEnabled && chat.language && chat.language !== myLanguage ? `Translates to ${chat.language} automatically` : 'Translation is off for this chat'
  if (chat.group) note = chat.translationEnabled ? 'Each member reads in their own language' : 'Translation is off for this chat'
  if (uploading) note = 'Uploading attachments…'

  return (
    <div
      className={`composer-wrap ${dragging ? 'is-dragging' : ''}`}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        addFiles(event.dataTransfer.files)
      }}
    >
      {context && (
        <div className="composer-context">
          {context.type === 'edit' ? <Pencil /> : <Reply />}
          <span>
            <strong>{context.type === 'edit' ? 'Editing message' : `Replying to ${contextName}`}</strong>
            <small>{messageSummary(context.message)}</small>
          </span>
          <button type="button" className="icon-button" aria-label={context.type === 'edit' ? 'Cancel editing' : 'Cancel reply'} onClick={() => { if (editing) updateText(''); onCancelContext() }}><X /></button>
        </div>
      )}

      {uploads.length > 0 && (
        <div className="pending-attachments" aria-label="Attachments to send">
          {uploads.map((upload) => (
            <div className={`pending-chip is-${upload.status}`} key={upload.id}>
              {upload.kind === 'image' ? <img src={upload.previewUrl} alt="" width={56} height={56} decoding="async" /> : upload.kind === 'audio' ? <Mic /> : <FileText />}
              <span>
                <strong>{upload.name}</strong>
                <small>
                  {upload.status === 'uploading' && `Uploading ${Math.round(upload.progress * 100)}%`}
                  {upload.status === 'done' && (upload.duration ? formatDuration(upload.duration) : formatBytes(upload.size))}
                  {upload.status === 'error' && 'Upload failed'}
                </small>
                {upload.status === 'uploading' && <i className="upload-bar" style={{ width: `${Math.max(4, upload.progress * 100)}%` }} />}
              </span>
              {upload.status === 'error' && (
                <button type="button" aria-label={`Retry ${upload.name}`} onClick={() => void runUpload(upload)}><RotateCcw /></button>
              )}
              <button type="button" aria-label={`Remove ${upload.name}`} onClick={() => removeUpload(upload.id)}><X /></button>
            </div>
          ))}
        </div>
      )}

      <div className="composer-tools">
        <button type="button" className="tool-button" aria-label="Attach file" onClick={() => fileInputRef.current?.click()} disabled={recording || editing}><Paperclip /></button>
        <button type="button" className="tool-button" aria-label="Add photo" onClick={() => photoInputRef.current?.click()} disabled={recording || editing}><ImageIcon /></button>
        <input ref={fileInputRef} type="file" multiple hidden onChange={(event) => { addFiles(event.target.files ?? []); event.target.value = '' }} />
        <input ref={photoInputRef} type="file" accept="image/*" multiple hidden onChange={(event) => { addFiles(event.target.files ?? []); event.target.value = '' }} />
      </div>

      {recording ? (
        <div className="composer recording" role="status">
          <span className="recording-dot" aria-hidden />
          <span>Recording {formatDuration(seconds)}</span>
          <button type="button" className="recording-cancel" onClick={() => finishRecording(false)}><Trash2 /> Cancel</button>
        </div>
      ) : (
        <div className="composer" ref={emojiRef}>
          <textarea
            ref={textareaRef}
            value={text}
            dir="auto"
            onChange={(event) => {
              updateText(event.target.value)
              if (event.target.value.trim()) onTyping()
            }}
            onPaste={(event) => {
              if (event.clipboardData.files.length) {
                event.preventDefault()
                addFiles(event.clipboardData.files)
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
                event.preventDefault()
                void submit()
              } else if (event.key === 'Escape' && context) {
                event.stopPropagation()
                if (editing) updateText('')
                onCancelContext()
              } else if (event.key === 'ArrowUp' && !text && !context) {
                event.preventDefault()
                onEditLast()
              }
            }}
            placeholder={editing ? 'Edit your message…' : `Write in ${myLanguage}…`}
            aria-label="Write a message"
            rows={1}
          />
          <button type="button" className="emoji-button" aria-label="Add emoji" aria-expanded={emojiOpen} onClick={() => setEmojiOpen((open) => !open)}><Smile /></button>
          {emojiOpen && <EmojiPicker onPick={insertEmoji} onClose={closeEmoji} />}
        </div>
      )}

      {recording ? (
        <button type="button" className="send-button" aria-label="Stop and send voice message" onClick={() => finishRecording(true)}><Send /></button>
      ) : canSend || editing || uploads.length ? (
        <button type="button" className="send-button" aria-label={editing ? 'Save edit' : 'Send message'} onClick={() => void submit()} disabled={!canSend}>{editing ? <Check /> : <Send />}</button>
      ) : (
        <button type="button" className="mic-button" aria-label="Record voice message" onClick={startRecording}><Mic /></button>
      )}
      <span className="composer-note">
        {recording ? <><Square /> Tap send to share, or cancel to discard</> : <><Globe2 /> {note}{dragging && ' · Drop files to attach'}</>}
      </span>
    </div>
  )
}
