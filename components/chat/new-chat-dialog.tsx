'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from 'convex/react'
import { ArrowRight, Globe2, Link2, ScanQrCode, Search, UserPlus, Users, X } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { colorFor, initialsFor, normalizePin, pinPattern } from '@/lib/chat-data'
import { parseInviteInput } from '@/lib/invite'
import { Avatar } from './avatar'
import { Modal } from './modal'

type NewChatDialogProps = {
  open: boolean
  initialTab?: 'direct' | 'group'
  onClose: () => void
  onStartDirect: (pin: string) => Promise<boolean>
  onCreateGroup: (name: string, pins: string[]) => Promise<boolean>
  onScanQr: () => void
  onOpenInvite: (code: string) => void
}

function usePinLookup(value: string) {
  const pin = normalizePin(value)
  const valid = pinPattern.test(pin)
  const result = useQuery(api.users.findByPin, valid ? { pin } : 'skip')
  return { pin, valid, result, loading: valid && result === undefined }
}

export function NewChatDialog({ open, initialTab = 'direct', onClose, onStartDirect, onCreateGroup, onScanQr, onOpenInvite }: NewChatDialogProps) {
  const [tab, setTab] = useState<'direct' | 'group'>(initialTab)

  useEffect(() => {
    if (open) setTab(initialTab)
  }, [open, initialTab])
  const [pinInput, setPinInput] = useState('')
  const [groupName, setGroupName] = useState('')
  const [members, setMembers] = useState<{ pin: string; name: string }[]>([])
  const [busy, setBusy] = useState(false)
  const lookup = usePinLookup(pinInput)

  function close() {
    setPinInput('')
    setGroupName('')
    setMembers([])
    setTab('direct')
    onClose()
  }

  async function startDirect(event: FormEvent) {
    event.preventDefault()
    if (!lookup.result || lookup.result.isSelf) return
    setBusy(true)
    const ok = await onStartDirect(lookup.pin)
    setBusy(false)
    if (ok) close()
  }

  function addMember(event: FormEvent) {
    event.preventDefault()
    if (!lookup.result || lookup.result.isSelf) return
    if (!members.some((member) => member.pin === lookup.pin)) setMembers((current) => [...current, { pin: lookup.pin, name: lookup.result!.name }])
    setPinInput('')
  }

  async function createGroup() {
    if (!groupName.trim() || !members.length) return
    setBusy(true)
    const ok = await onCreateGroup(groupName.trim(), members.map((member) => member.pin))
    setBusy(false)
    if (ok) close()
  }

  const pasted = parseInviteInput(pinInput)
  const pastedInvite = tab === 'direct' && pasted?.kind === 'invite' ? pasted.code : null

  const lookupStatus = !pinInput.trim() || pastedInvite
    ? null
    : !lookup.valid
      ? 'PINs look like AFJ-7K2P.'
      : lookup.loading
        ? 'Looking up…'
        : lookup.result === null
          ? `No one found with PIN ${lookup.pin}.`
          : lookup.result?.isSelf
            ? 'That’s your own PIN.'
            : null

  return (
    <Modal open={open} title="Start a new chat" onClose={close} className="new-chat-modal">
      <div className="modal-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'direct'} className={tab === 'direct' ? 'active' : ''} onClick={() => setTab('direct')}>
          <Search /> Direct
        </button>
        <button type="button" role="tab" aria-selected={tab === 'group'} className={tab === 'group' ? 'active' : ''} onClick={() => setTab('group')}>
          <Users /> Group
        </button>
      </div>

      {tab === 'group' && (
        <label className="new-chat-form">
          Group name
          <div className="pin-field">
            <Users />
            <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Family, Design circle…" maxLength={60} />
          </div>
        </label>
      )}

      <form onSubmit={tab === 'direct' ? startDirect : addMember} className="new-chat-form">
        <label htmlFor="new-chat-pin">{tab === 'direct' ? 'Enter their afjini PIN' : 'Add members by PIN'}</label>
        <div className="pin-field">
          <Search />
          <input
            id="new-chat-pin"
            value={pinInput}
            data-autofocus
            autoComplete="off"
            placeholder="AFJ-7K2P"
            aria-invalid={Boolean(lookupStatus && lookup.valid && !lookup.loading)}
            onChange={(event) => setPinInput(event.target.value)}
          />
          {tab === 'direct' && (
            <button type="button" className="pin-field-scan" onClick={() => { close(); onScanQr() }} aria-label="Scan a QR code">
              <ScanQrCode /> <span>Scan QR</span>
            </button>
          )}
        </div>
        {lookupStatus && <p className="field-hint" role="status">{lookupStatus}</p>}
        {pastedInvite && (
          <div className="contact-pick">
            <span className="contact-pick-icon"><Link2 /></span>
            <span>
              <strong>That’s an invite link</strong>
              <small>Open it to see who sent it before you connect.</small>
            </span>
            <button type="button" className="modal-primary" onClick={() => { close(); onOpenInvite(pastedInvite) }}>
              Open invite <ArrowRight />
            </button>
          </div>
        )}
        {lookup.result && !lookup.result.isSelf && (
          <div className="contact-pick">
            <Avatar initials={initialsFor(lookup.result.name)} color={colorFor(lookup.result._id)} imageUrl={lookup.result.imageUrl} small />
            <span>
              <strong>{lookup.result.name}</strong>
              <small><Globe2 /> Reads in {lookup.result.language} · {lookup.result.pin}</small>
            </span>
            <button type="submit" className="modal-primary" disabled={busy}>
              {tab === 'direct' ? <>Message <ArrowRight /></> : <>Add <UserPlus /></>}
            </button>
          </div>
        )}
      </form>

      {tab === 'group' && (
        <>
          {members.length > 0 && (
            <div className="member-chips">
              {members.map((member) => (
                <span className="member-chip" key={member.pin}>
                  {member.name}
                  <button type="button" aria-label={`Remove ${member.name}`} onClick={() => setMembers((current) => current.filter((item) => item.pin !== member.pin))}><X /></button>
                </span>
              ))}
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="modal-secondary" onClick={close}>Cancel</button>
            <button type="button" className="modal-primary" disabled={busy || !groupName.trim() || !members.length} onClick={() => void createGroup()}>
              Create group
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
