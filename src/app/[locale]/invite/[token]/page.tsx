import { redirect } from 'next/navigation'
import {Link} from '@/navigation'
import { auth } from '@/lib/auth'
import { getInviteByToken } from '@/lib/api/invites'
import { getClinicianInviteByToken } from '@/lib/api/invites'
import { AcceptInviteButton } from './accept-button'
import { AcceptClinicianInvite } from './accept-clinician'

interface InvitePageProps {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params

  // During build, API calls will fail - return a loading shell
  let familyInvite = null
  let clinicianInvite = null

  try {
    // Check both invite types
    [familyInvite, clinicianInvite] = await Promise.all([
      getInviteByToken(token),
      getClinicianInviteByToken(token),
    ])
  } catch (error) {
    // During build, return a minimal shell that will be hydrated client-side
    if (process.env.CAPACITOR_BUILD === 'true' || token === '_placeholder_') {
      return (
        <main className="min-h-screen flex flex-col items-center justify-center p-md">
          <div className="max-w-sm text-center">
            <div className="animate-pulse">Loading invite...</div>
          </div>
        </main>
      )
    }
    throw error
  }

  const invite = familyInvite || clinicianInvite
  const isClinician = !familyInvite && !!clinicianInvite

  if (!invite) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-md">
        <div className="max-w-sm text-center">
          <h1 className="text-h2 font-bold text-text-primary mb-sm">Invite not found</h1>
          <p className="text-body text-text-secondary mb-md">
            This invite link may have expired or already been used.
          </p>
          <Link href="/login" className="text-purple-600 hover:text-purple-700 hover:underline font-medium">
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
          <h1 className="text-h2 font-bold text-text-primary mb-sm">Invite already used</h1>
          <p className="text-body text-text-secondary mb-md">
            This invite has already been accepted.
          </p>
          <Link href="/dashboard" className="text-purple-600 hover:text-purple-700 hover:underline font-medium">
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
          <h1 className="text-h2 font-bold text-text-primary mb-sm">Invite expired</h1>
          <p className="text-body text-text-secondary mb-md">
            This invite link has expired. Please ask for a new one.
          </p>
          <Link href="/login" className="text-purple-600 hover:text-purple-700 hover:underline font-medium">
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
          <h1 className="text-h2 font-bold text-text-primary mb-sm">You're invited</h1>
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
              className="block w-full px-lg py-sm rounded-md bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg transition-all text-body font-medium text-center"
            >
              Create account
            </Link>
            <Link
              href={`/login?redirect=/invite/${token}`}
              className="block w-full px-lg py-sm border-2 border-purple-200 text-purple-700 rounded-md hover:border-purple-400 hover:bg-purple-50 transition-all text-body font-medium text-center"
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
          <h1 className="text-h2 font-bold text-text-primary mb-sm">Wrong account</h1>
          <p className="text-body text-text-secondary mb-md">
            This invite was sent to <span className="font-medium">{invite.email}</span>,
            but you're signed in as <span className="font-medium">{session.user.email}</span>.
          </p>
          <p className="text-body text-text-secondary mb-lg">
            Sign out and try again with the correct account.
          </p>
          <Link href="/dashboard" className="text-purple-600 hover:text-purple-700 hover:underline font-medium">
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
            <h1 className="text-h2 font-bold text-text-primary mb-sm">Accept clinical access</h1>
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

// For Capacitor static export - generate a placeholder
// The actual token will be determined client-side from the URL
export const dynamicParams = true
export async function generateStaticParams() {
  // Return a placeholder path
  return [{ token: '_placeholder_' }]
}
