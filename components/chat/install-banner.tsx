'use client'

import { Download, X } from 'lucide-react'
import { useInstallNudge } from '@/hooks/use-install-prompt'

type InstallBannerProps = {
  hidden: boolean
  overChat: boolean
  onIosHelp: () => void
}

export function InstallBanner({ hidden, overChat, onIosHelp }: InstallBannerProps) {
  const nudge = useInstallNudge()
  if (hidden || !nudge.visible) return null

  return (
    <div className={`install-banner ${overChat ? 'is-over-chat' : ''}`} role="dialog" aria-labelledby="install-banner-title" aria-describedby="install-banner-detail">
      <img src="/icons/192" alt="" width={44} height={44} decoding="async" />
      <div className="install-banner-copy">
        <strong id="install-banner-title">Install afjini</strong>
        <small id="install-banner-detail">Open it from your home screen and get message and call notifications.</small>
      </div>
      <div className="install-banner-actions">
        <button type="button" className="modal-secondary" onClick={nudge.dismiss}>Not now</button>
        <button
          type="button"
          className="modal-primary"
          onClick={() => {
            if (nudge.canPrompt) void nudge.accept()
            else {
              onIosHelp()
              nudge.dismiss()
            }
          }}
        >
          <Download aria-hidden /> {nudge.canPrompt ? 'Install' : 'How to install'}
        </button>
      </div>
      <button type="button" className="install-banner-close" aria-label="Dismiss install suggestion" onClick={nudge.dismiss}><X /></button>
    </div>
  )
}
