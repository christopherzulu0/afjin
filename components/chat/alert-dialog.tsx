'use client'

import { useId } from 'react'
import { Modal } from './modal'

export type AlertContent = { title: string; message: string }

export function AlertDialog({ alert, onClose }: { alert: AlertContent | null; onClose: () => void }) {
  const messageId = useId()

  return (
    <Modal open={Boolean(alert)} title={alert?.title ?? ''} onClose={onClose} className="confirm-modal alert-modal" role="alertdialog" describedBy={messageId}>
      {/* Focus the message, not a button: the Enter that sent the message would otherwise "click" OK and close this instantly. */}
      <p id={messageId} tabIndex={-1} data-autofocus className="alert-message">{alert?.message}</p>
      <div className="modal-actions">
        <button type="button" className="modal-primary" onClick={onClose}>OK</button>
      </div>
    </Modal>
  )
}
