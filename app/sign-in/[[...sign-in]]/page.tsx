import Link from 'next/link'
import { SignIn } from '@clerk/nextjs'
import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata({ title: 'Sign in', description: 'Sign in to afjini.', path: '/sign-in', noIndex: true })

export default function SignInPage() {
  return (
    <main className="auth-page">
      <Link href="/" className="auth-brand" aria-label="afjini home">
        <img src="/brand/emblem.webp" alt="" className="auth-emblem" width={360} height={240} />
      </Link>
      <SignIn />
    </main>
  )
}
