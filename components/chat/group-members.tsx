'use client'

import { useCallback, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Ban, ChevronDown, Copy, Link2, Link2Off, MoreHorizontal, QrCode as QrIcon, RotateCcw, Share2, ShieldCheck, ShieldOff, UserMinus, UserPlus } from 'lucide-react'
import dynamic from 'next/dynamic'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { errorMessage } from '@/hooks/use-convex-chat'
import { useMenu } from '@/hooks/use-menu'
import { colorFor, initialsFor, normalizePin, pinPattern, type Conversation, type Member, type MemberRole } from '@/lib/chat-data'
import { canShare, copyText, inviteUrl, shareLink } from '@/lib/invite'
import { Avatar } from './avatar'

const QrCode = dynamic(() => import('@/components/qr-code').then((module) => module.QrCode), { ssr: false })

const RANK: Record<MemberRole, number> = { member: 0, admin: 1, owner: 2 }
const ROLE_LABEL: Partial<Record<MemberRole, string>> = { owner: 'Owner', admin: 'Admin' }

export type MemberAction = 'remove' | 'ban' | 'make_admin' | 'remove_admin'

type GroupMembersProps = {
  chat: Conversation
  myLanguage: string
  onAddMember: (pin: string) => Promise<boolean>
  onMemberAction: (action: MemberAction, member: Member) => void
  onUnban: (userId: string, name: string) => void
  notify: (message: string) => void
}

export function GroupMembers({ chat, myLanguage, onAddMember, onMemberAction, onUnban, notify }: GroupMembersProps) {
  const [pin, setPin] = useState('')
  const [adding, setAdding] = useState(false)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<string | null>(null)
  const menuRef = useRef<HTMLLIElement>(null)
  const closeMenu = useCallback(() => setMenuFor(null), [])
  useMenu(menuRef, menuFor !== null, closeMenu)
  const [showBanned, setShowBanned] = useState(false)
  const isAdmin = RANK[chat.myRole] >= RANK.admin
  const isOwner = chat.myRole === 'owner'
  const banned = useQuery(api.conversations.bannedMembers, isAdmin ? { conversationId: chat.id as Id<'conversations'> } : 'skip') ?? []
  const validPin = pinPattern.test(normalizePin(pin))

  async function addMember(event: FormEvent) {
    event.preventDefault()
    if (!validPin) return
    setAdding(true)
    const ok = await onAddMember(normalizePin(pin))
    setAdding(false)
    if (ok) setPin('')
  }

  function act(action: MemberAction, member: Member) {
    setMenuFor(null)
    onMemberAction(action, member)
  }

  return (
    <div className="detail-section">
      <h3>Members <small className="member-count">{chat.members.length + 1}</small></h3>
      <ul className="member-list" aria-label="Members">
        <li className="member-self">
          <span className="member-you">You</span>
          <span><small>Reads in {myLanguage}</small></span>
          {ROLE_LABEL[chat.myRole] && <em className={`role-badge role-${chat.myRole}`}>{ROLE_LABEL[chat.myRole]}</em>}
        </li>
        {chat.members.map((member) => {
          const manageable = isAdmin && RANK[chat.myRole] > RANK[member.role]
          const canChangeRole = isOwner && member.role !== 'owner'
          return (
            <li key={member.id} className={menuFor === member.id ? 'menu-open' : ''} ref={menuAnchor === member.id ? menuRef : undefined}>
              <Avatar initials={member.initials} color={member.color} imageUrl={member.imageUrl} small />
              <span><strong>{member.name}</strong><small>Reads in {member.language}</small></span>
              {ROLE_LABEL[member.role] && <em className={`role-badge role-${member.role}`}>{ROLE_LABEL[member.role]}</em>}
              {(manageable || canChangeRole) && (
                <button
                  type="button"
                  className="icon-button member-menu-button"
                  aria-label={`Manage ${member.name}`}
                  aria-expanded={menuFor === member.id}
                  onClick={() => {
                    setMenuAnchor(member.id)
                    setMenuFor((current) => (current === member.id ? null : member.id))
                  }}
                >
                  <MoreHorizontal />
                </button>
              )}
              {menuFor === member.id && (
                <div className="member-actions" role="menu">
                  {canChangeRole && member.role === 'member' && (
                    <button type="button" role="menuitem" onClick={() => act('make_admin', member)}><ShieldCheck /> Make admin</button>
                  )}
                  {canChangeRole && member.role === 'admin' && (
                    <button type="button" role="menuitem" onClick={() => act('remove_admin', member)}><ShieldOff /> Remove admin</button>
                  )}
                  {manageable && (
                    <button type="button" role="menuitem" onClick={() => act('remove', member)}><UserMinus /> Remove from group</button>
                  )}
                  {manageable && (
                    <button type="button" role="menuitem" className="danger" onClick={() => act('ban', member)}><Ban /> Ban from group</button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {isAdmin ? (
        <>
          <form className="add-member" onSubmit={addMember}>
            <input value={pin} onChange={(event) => setPin(event.target.value)} placeholder="Add by PIN, e.g. AFJ-7K2P" aria-label="Add a member by PIN" />
            <button type="submit" disabled={!validPin || adding} aria-label="Add member"><UserPlus /></button>
          </form>
          <GroupInvite chat={chat} notify={notify} />
        </>
      ) : (
        <p className="detail-empty member-hint">Only group admins can add or remove people.</p>
      )}

      {isAdmin && banned.length > 0 && (
        <div className="banned-list">
          <button type="button" className="banned-toggle" aria-expanded={showBanned} onClick={() => setShowBanned((value) => !value)}>
            Banned ({banned.length}) <ChevronDown className={showBanned ? 'is-open' : ''} />
          </button>
          {showBanned && (
            <ul className="member-list">
              {banned.map((person) => (
                <li key={person._id}>
                  <Avatar initials={initialsFor(person.name)} color={colorFor(person._id)} imageUrl={person.imageUrl} small />
                  <span><strong>{person.name}</strong><small>{person.pin}</small></span>
                  <button type="button" className="unban-button" onClick={() => onUnban(person._id, person.name)}>Unban</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function GroupInvite({ chat, notify }: { chat: Conversation; notify: (message: string) => void }) {
  const conversationId = chat.id as Id<'conversations'>
  const code = useQuery(api.invites.groupInvite, { conversationId })
  const create = useMutation(api.invites.createGroupInvite)
  const reset = useMutation(api.invites.resetGroupInvite)
  const disable = useMutation(api.invites.disableGroupInvite)
  const [showQr, setShowQr] = useState(false)
  const [busy, setBusy] = useState(false)
  const url = code ? inviteUrl(code) : null

  async function run(task: () => Promise<unknown>, success: string) {
    setBusy(true)
    try {
      await task()
      notify(success)
    } catch (error) {
      notify(errorMessage(error))
    }
    setBusy(false)
  }

  async function copy() {
    if (url) notify((await copyText(url)) ? 'Group invite link copied' : url)
  }

  async function share() {
    if (url && !(await shareLink(url, `Join ${chat.name} on afjini`))) await copy()
  }

  return (
    <div className="group-invite">
      <h4><Link2 /> Invite link</h4>
      {url ? (
        <>
          <div className="invite-link-row is-compact">
            <input value={url} readOnly aria-label="Group invite link" onFocus={(event) => event.currentTarget.select()} />
            <button type="button" className="icon-button" aria-label="Copy group invite link" onClick={() => void copy()}><Copy /></button>
            {canShare() && <button type="button" className="icon-button" aria-label="Share group invite link" onClick={() => void share()}><Share2 /></button>}
          </div>
          <div className="group-invite-actions">
            <button type="button" aria-expanded={showQr} onClick={() => setShowQr((value) => !value)}><QrIcon /> {showQr ? 'Hide QR' : 'QR code'}</button>
            <button type="button" disabled={busy} onClick={() => void run(() => reset({ conversationId }), 'New group link ready. The old one no longer works.')}><RotateCcw /> Reset</button>
            <button type="button" className="danger" disabled={busy} onClick={() => void run(() => disable({ conversationId }), 'Group invite link turned off')}><Link2Off /> Turn off</button>
          </div>
          {showQr && <QrCode value={url} label={`QR code to join ${chat.name}`} fileName={`afjini-${chat.name.replace(/\W+/g, '-').toLowerCase()}`} className="is-compact" />}
        </>
      ) : (
        <>
          <p className="detail-empty member-hint">Anyone with the link can join as a member. Banned people can’t.</p>
          <button type="button" className="group-invite-create" disabled={code === undefined || busy} onClick={() => void run(() => create({ conversationId }), 'Group invite link created')}>
            <Link2 /> Create invite link
          </button>
        </>
      )}
    </div>
  )
}
