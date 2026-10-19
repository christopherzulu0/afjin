'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Download } from 'lucide-react'

const colors = { dark: '#061f28', light: '#f6ecd9' }

type QrCodeProps = { value: string; label: string; fileName?: string; className?: string }

export function QrCode({ value, label, fileName = 'afjini-invite', className = '' }: QrCodeProps) {
  const [svg, setSvg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toString(value, { type: 'svg', margin: 2, errorCorrectionLevel: 'M', color: colors })
      .then((markup) => { if (!cancelled) setSvg(markup) })
      .catch(() => { if (!cancelled) setSvg(null) })
    return () => { cancelled = true }
  }, [value])

  async function downloadPng() {
    const url = await QRCode.toDataURL(value, { width: 768, margin: 2, errorCorrectionLevel: 'M', color: colors })
    const link = document.createElement('a')
    link.href = url
    link.download = `${fileName}.png`
    link.click()
  }

  return (
    <figure className={`qr-card ${className}`}>
      <div className="qr-image" role="img" aria-label={label} dangerouslySetInnerHTML={svg ? { __html: svg } : undefined} />
      <button type="button" className="qr-download" onClick={() => void downloadPng()} disabled={!svg}>
        <Download /> Download PNG
      </button>
    </figure>
  )
}
