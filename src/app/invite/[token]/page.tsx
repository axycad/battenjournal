import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getInviteByToken } from '@/actions/invite'
import { getClinicianInviteByToken } from '@/actions/sharing'
import { AcceptInviteButton } from './accept-button'
import { AcceptClinicianInvite } from './accept-clinician'

interface InvitePageProps {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params
  
  // Check both invite types
  const [familyInvite, clinicianInvite] = await Promise.all([
    getInviteByToken(token),
    getClinicianInviteByToken(token),
  ])

  const invite = familyInvite || clinicianInvite
  const isClinician = !familyInvite && !!clinicianInvite

  if (!invite) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-md">
        <div className="max-w-sm text-center">
          <h1 className="screen-title mb-sm">Invite not found</h1>
          <p className="text-body text-text-secondary mb-md">
            This invite link may have expired or already been used.
          </p>
          <Link href="/login" className="text-accent-primary hover:underline">
            Go to login
          </Link>
        </div>
      </main>
    )
  }

  if (invite.acceptedAt) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-md">
        <div className="max-w-sm text-center">
          <h1 className="screen-title mb-sm">Invite already used</h1>
          <p className="text-body text-text-secondary mb-md">
            This invite has already been accepted.
          </p>
          <Link href="/dashboard" className="text-accent-primary hover:underline">
            Go to dashboard
          </Link>
        </div>
      </main>
    )
  }

  if (invite.expiresAt < new Date()) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-md">
        <div className="max-w-sm text-center">
          <h1 className="screen-title mb-sm">Invite expired</h1>
          <p className="text-body text-text-secondary mb-md">
            This invite link has expired. Please ask for a new one.
          </p>
          <Link href="/login" className="text-accent-primary hover:underline">
            Go to login
          </Link>
        </div>
      </main>
    )
  }

  const session = await auth()

  // Not logged in - prompt to register or login
  if (!session) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-md">
        <div className="max-w-sm text-center">
          <h1 className="screen-title mb-sm">You're invited</h1>
          <p className="text-body text-text-secondary mb-md">
            {invite.invitedByName} has invited you to{' '}
            {isClinician ? 'view records for' : 'help care for'}{' '}
            <span className="font-medium">{invite.childDisplayName}</span>.
          </p>
          <p className="text-body text-text-secondary mb-lg">
            Create an account or sign in to accept this invite.
          </p>
          <div className="space-y-sm">
            <Link
              href={`/register?redirect=/invite/${token}`}
              className="block w-full btn-primary text-center"
            >
              Create account
            </Link>
            <Link
              href={`/login?redirect=/invite/${token}`}
              className="block w-full btn-secondary text-center"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // Check if the logged-in user's email matches
  const emailMatches =
    session.user.email?.toLowerCase() === invite.email.toLowerCase()

  if (!emailMatches) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-md">
        <div className="max-w-sm text-center">
          <h1 className="screen-title mb-sm">Wrong account</h1>
          <p className="text-body text-text-secondary mb-md">
            This invite was sent to <span className="font-medium">{invite.email}</span>,
            but you're signed in as <span className="font-medium">{session.user.email}</span>.
          </p>
          <p className="text-body text-text-secondary mb-lg">
            Sign out and try again with the correct account.
          </p>
          <Link href="/dashboard" className="text-accent-primary hover:underline">
            Go to dashboard
          </Link>
        </div>
      </main>
    )
  }

  // Ready to accept - show appropriate form
  if (isClinician) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-md">
        <div className="max-w-sm">
          <div className="text-center mb-lg">
            <h1 className="screen-title mb-sm">Accept clinical access</h1>
            <p className="text-body text-text-secondary">
              {invite.invitedByName} has invited you to view records for{' '}
              <span className="font-medium">{invite.childDisplayName}</span>.
            </p>
          </div>
          <AcceptClinicianInvite token={token} />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-md">
      <div className="max-w-sm text-center">
        <h1 className="screen-title mb-sm">Accept invite</h1>
        <p className="text-body text-text-secondary mb-lg">
          {invite.invitedByName} has invited you to help care for{' '}
          <span className="font-medium">{invite.childDisplayName}</span>.
        </p>
        <AcceptInviteButton token={token} />
      </div>
    </main>
  )
}
