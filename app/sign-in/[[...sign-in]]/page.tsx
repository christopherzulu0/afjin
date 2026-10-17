import Link from 'next/link'
import { SignIn } from '@clerk/nextjs'

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
