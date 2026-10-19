'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import jsQR from 'jsqr'
import { CameraOff, ImageUp, Loader2, ScanLine } from 'lucide-react'
import { parseInviteInput, type InviteTarget } from '@/lib/invite'

const SCAN_INTERVAL_MS = 250
const MAX_SCAN_WIDTH = 720

type CameraState = 'starting' | 'scanning' | 'denied' | 'unavailable'

type QrScannerProps = { onScan: (target: InviteTarget) => void }

function decode(source: CanvasImageSource, width: number, height: number, canvas: HTMLCanvasElement) {
  const scale = Math.min(1, MAX_SCAN_WIDTH / width)
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  const image = context.getImageData(0, 0, canvas.width, canvas.height)
  return jsQR(image.data, image.width, image.height)?.data ?? null
}

export function QrScanner({ onScan }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const onScanRef = useRef(onScan)
  const [camera, setCamera] = useState<CameraState>('starting')
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  function canvas() {
    canvasRef.current ??= document.createElement('canvas')
    return canvasRef.current
  }

  function handle(text: string | null) {
    if (!text) return false
    const target = parseInviteInput(text)
    if (!target) {
      setHint('That QR code isn’t an afjini invite or PIN.')
      return false
    }
    onScanRef.current(target)
    return true
  }

  useEffect(() => {
    let stream: MediaStream | null = null
    let timer: number | null = null
    let stopped = false

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamera('unavailable')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      } catch (error) {
        setCamera(error instanceof DOMException && error.name === 'NotAllowedError' ? 'denied' : 'unavailable')
        return
      }
      const video = videoRef.current
      if (stopped || !video) return
      video.srcObject = stream
      await video.play().catch(() => undefined)
      setCamera('scanning')
      timer = window.setInterval(() => {
        if (video.readyState < video.HAVE_CURRENT_DATA || !video.videoWidth) return
        if (handle(decode(video, video.videoWidth, video.videoHeight, canvas())) && timer) {
          window.clearInterval(timer)
          timer = null
        }
      }, SCAN_INTERVAL_MS)
    }

    void start()
    return () => {
      stopped = true
      if (timer) window.clearInterval(timer)
      stream?.getTracks().forEach((track) => track.stop())
    }
    // The camera runs once per mount; handle() reads the latest callback from a ref.
  }, [])

  async function scanFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setHint(null)
    try {
      const bitmap = await createImageBitmap(file)
      const text = decode(bitmap, bitmap.width, bitmap.height, canvas())
      bitmap.close()
      if (!text) setHint('No QR code found in that image. Try a sharper, closer photo.')
      else handle(text)
    } catch {
      setHint('That file couldn’t be read as an image.')
    }
  }

  return (
    <div className="qr-scanner">
      <div className={`qr-viewfinder is-${camera}`}>
        <video ref={videoRef} muted playsInline aria-label="Camera preview" />
        {camera === 'scanning' && <span className="qr-frame" aria-hidden><ScanLine /></span>}
        {camera === 'starting' && <span className="qr-status"><Loader2 className="spin" /> Starting camera…</span>}
        {(camera === 'denied' || camera === 'unavailable') && (
          <span className="qr-status">
            <CameraOff />
            {camera === 'denied' ? 'Camera access was blocked. Allow it in your browser settings, or upload a photo of the code.' : 'No camera available here. Upload a photo or screenshot of the code instead.'}
          </span>
        )}
      </div>
      <p className="field-hint" role="status">{hint ?? (camera === 'scanning' ? 'Point your camera at an afjini QR code.' : '\u00a0')}</p>
      <button type="button" className="modal-secondary qr-upload" onClick={() => fileRef.current?.click()}>
        <ImageUp /> Upload a QR image
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(event) => void scanFile(event)} />
    </div>
  )
}
