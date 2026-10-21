import Link from 'next/link'
import { SignUp } from '@clerk/nextjs'
import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata({ title: 'Create your account', description: 'Create a free afjini account.', path: '/sign-up', noIndex: true })

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <Link href="/" className="auth-brand" aria-label="afjini home">
        <img src="/brand/emblem.webp" alt="" className="auth-emblem" width={360} height={240} />
      </Link>
      <SignUp />
      <p className="auth-legal">
        By continuing you agree to the <Link href="/terms">Terms &amp; Conditions</Link> and <Link href="/privacy/policy">Privacy Policy</Link>.
      </p>
    </main>
  )
}
