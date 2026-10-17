import Link from 'next/link'
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <Link href="/" className="landing-brand auth-brand">
        <span className="brand-mark">A</span>
        <span>afjini</span>
      </Link>
      <SignUp />
    </main>
  )
}
