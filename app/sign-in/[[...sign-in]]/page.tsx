import Link from 'next/link'
import { SignIn } from '@clerk/nextjs'
import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata({ title: 'Sign in', description: 'Sign in to afjini.', path: '/sign-in', noIndex: true })

export default function SignInPage() {
  return (
    <main className="auth-page">
      <Link href="/" className="landing-brand auth-brand">
        <span className="brand-mark">A</span>
        <span>afjini</span>
      </Link>
      <SignIn />
    </main>
  )
}
