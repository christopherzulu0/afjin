'use client'

import { useState } from 'react'
import { Copy, Loader2, QrCode as QrIcon, RotateCcw, ScanQrCode, Share2 } from 'lucide-react'
import { QrCode } from '@/components/qr-code'
import { useMyInvite } from '@/hooks/use-my-invite'
import { errorMessage } from '@/hooks/use-convex-chat'
import { canShare, copyText, shareLink, type InviteTarget } from '@/lib/invite'
import { Modal } from './modal'
import { QrScanner } from './qr-scanner'

export type InviteTab = 'share' | 'scan'

type InviteDialogProps = {
  open: boolean
  tab: InviteTab
  myName: string
  myPin: string
  onTabChange: (tab: InviteTab) => void
  onClose: () => void
  onScan: (target: InviteTarget) => void
  notify: (message: string) => void
}

export function InviteDialog({ open, tab, myName, myPin, onTabChange, onClose, onScan, notify }: InviteDialogProps) {
  const { url, reset } = useMyInvite(open)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)

  function close() {
    setConfirmReset(false)
    onClose()
  }

  async function copy() {
    if (!url) return
    notify((await copyText(url)) ? 'Invite link copied' : url)
  }

  async function share() {
    if (url && !(await shareLink(url, `Chat with ${myName} on afjini`))) await copy()
  }

  async function resetLink() {
    setResetting(true)
    try {
      await reset()
      notify('New invite link ready. The old one no longer works.')
    } catch (error) {
      notify(errorMessage(error))
    }
    setResetting(false)
    setConfirmReset(false)
  }

  return (
    <Modal open={open} title="Invite people" onClose={close} className="invite-modal">
      <div className="modal-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'share'} className={tab === 'share' ? 'active' : ''} onClick={() => onTabChange('share')}>
          <QrIcon /> My invite
        </button>
        <button type="button" role="tab" aria-selected={tab === 'scan'} className={tab === 'scan' ? 'active' : ''} onClick={() => onTabChange('scan')}>
          <ScanQrCode /> Scan a code
        </button>
      </div>

      {tab === 'share' ? (
        <div className="invite-share">
          {url ? (
            <QrCode value={url} label="QR code for your afjini invite link" fileName={`afjini-${myPin}`} />
          ) : (
            <div className="qr-card qr-placeholder" aria-busy="true"><Loader2 className="spin" /></div>
          )}
          <p className="field-hint">Anyone who scans this code or opens the link can start a chat with you.</p>
          <div className="invite-link-row">
            <input value={url ?? 'Creating your link…'} readOnly aria-label="Your invite link" data-autofocus onFocus={(event) => event.currentTarget.select()} />
            <button type="button" className="modal-secondary" onClick={() => void copy()} disabled={!url}><Copy /> Copy</button>
            {canShare() && (
              <button type="button" className="modal-primary" onClick={() => void share()} disabled={!url}><Share2 /> Share</button>
            )}
          </div>
          <div className="invite-footer">
            <span>Your PIN <b>{myPin}</b></span>
            {confirmReset ? (
              <span className="invite-reset-confirm">
                Old link stops working.
                <button type="button" className="modal-secondary" onClick={() => setConfirmReset(false)}>Keep</button>
                <button type="button" className="modal-danger" onClick={() => void resetLink()} disabled={resetting}>{resetting ? 'Resetting…' : 'Reset link'}</button>
              </span>
            ) : (
              <button type="button" className="invite-reset-button" onClick={() => setConfirmReset(true)} disabled={!url}><RotateCcw /> Reset link</button>
            )}
          </div>
        </div>
      ) : (
        <QrScanner onScan={onScan} />
      )}
    </Modal>
  )
}
