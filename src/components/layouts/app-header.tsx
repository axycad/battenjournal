'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui'

interface AppHeaderProps {
  user: {
    name?: string | null
    email?: string | null
  }
}

export function AppHeader({ user }: AppHeaderProps) {
  return (
    <header className="border-b border-divider bg-white">
      <div className="max-w-3xl mx-auto px-md py-sm flex items-center justify-between">
        <Link href="/dashboard" className="text-title-md font-medium text-text-primary">
          Batten Journal
        </Link>

        <div className="flex items-center gap-sm">
          <span className="text-meta text-text-secondary">
            {user.name || user.email}
          </span>
          <Link
            href="/settings/sync"
            className="text-meta text-text-secondary hover:text-text-primary"
          >
            Settings
          </Link>
          <Button
            variant="text"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="h-auto px-0"
          >
            Sign out
          </Button>
        </div>
      </div>
    </header>
  )
}
