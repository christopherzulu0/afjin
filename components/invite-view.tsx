'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { ArrowRight, Ban, Globe2, Link2Off, Loader2, MessageCircle, UserPlus, Users } from 'lucide-react'
import { Avatar } from '@/components/chat/avatar'
import { SiteNav } from '@/components/site-nav'
import { api } from '@/convex/_generated/api'
import { errorMessage, useCurrentUser } from '@/hooks/use-convex-chat'
import { colorFor, initialsFor } from '@/lib/chat-data'

export function InviteView({ code }: { code: string }) {
  const router = useRouter()
  const { me, error: profileError } = useCurrentUser()
  const preview = useQuery(api.invites.preview, me ? { code } : 'skip')
  const accept = useMutation(api.invites.accept)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function join() {
    setBusy(true)
    setError(null)
    try {
      const conversationId = await accept({ code })
      router.push(`/chat?c=${conversationId}`)
    } catch (reason) {
      setError(errorMessage(reason))
      setBusy(false)
    }
  }

  let card: React.ReactNode
  if (profileError) {
    card = <InviteNotice icon={<Link2Off />} title="We couldn’t load your profile" body={profileError} />
  } else if (!me || preview === undefined) {
    card = (
      <div className="invite-card invite-loading" aria-busy="true">
        <Loader2 className="spin" /> <span>Opening invite…</span>
      </div>
    )
  } else if (preview === null) {
    card = <InviteNotice icon={<Link2Off />} title="This invite link doesn’t work anymore" body="It may have been reset or turned off. Ask for a new link, or add them by PIN." />
  } else if (preview.kind === 'user') {
    card = (
      <article className="invite-card">
        <Avatar initials={initialsFor(preview.name)} color={colorFor(preview.pin)} imageUrl={preview.imageUrl} />
        <span className="invite-kicker">{preview.isSelf ? 'Your invite link' : 'You’re invited to chat with'}</span>
        <h1>{preview.name}</h1>
        <p><Globe2 /> Reads in {preview.language} · {preview.pin}</p>
        {preview.isSelf ? (
          <>
            <p className="invite-hint">Share this link or its QR code so people can message you.</p>
            <Link href="/chat" className="connect-button">Back to chats <ArrowRight /></Link>
          </>
        ) : (
          <button type="button" className="connect-button" onClick={() => void join()} disabled={busy}>
            {busy ? <Loader2 className="spin" /> : <MessageCircle />} Message {preview.name.split(' ')[0]}
          </button>
        )}
        {error && <p className="field-error" role="alert">{error}</p>}
      </article>
    )
  } else if (preview.banned) {
    card = <InviteNotice icon={<Ban />} title={`You can’t join ${preview.name}`} body="An admin banned you from this group, so its invite link doesn’t work for you." />
  } else {
    card = (
      <article className="invite-card">
        <Avatar initials={initialsFor(preview.name)} color={colorFor(preview.conversationId)} />
        <span className="invite-kicker">{preview.alreadyMember ? 'You’re already in' : 'You’re invited to join'}</span>
        <h1>{preview.name}</h1>
        <p><Users /> {preview.memberCount} {preview.memberCount === 1 ? 'member' : 'members'} · Messages are translated for everyone</p>
        {preview.alreadyMember ? (
          <Link href={`/chat?c=${preview.conversationId}`} className="connect-button">Open the group <ArrowRight /></Link>
        ) : (
          <button type="button" className="connect-button" onClick={() => void join()} disabled={busy}>
            {busy ? <Loader2 className="spin" /> : <UserPlus />} Join group
          </button>
        )}
        {error && <p className="field-error" role="alert">{error}</p>}
      </article>
    )
  }

  return (
    <main className="contacts-page subpage invite-page">
      <SiteNav variant="contacts" />
      <section className="invite-section">{card}</section>
    </main>
  )
}

function InviteNotice({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <article className="invite-card invite-notice">
      <span className="invite-notice-icon">{icon}</span>
      <h1>{title}</h1>
      <p>{body}</p>
      <Link href="/chat" className="connect-button">Go to your chats <ArrowRight /></Link>
    </article>
  )
}
