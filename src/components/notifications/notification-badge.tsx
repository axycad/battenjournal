'use client'

import { useEffect, useState } from 'react'
import { getUnreadCount } from '@/actions/notification'

export function NotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Initial fetch
    fetchUnreadCount()

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)

    return () => clearInterval(interval)
  }, [])

  async function fetchUnreadCount() {
    const count = await getUnreadCount()
    setUnreadCount(count)
  }

  if (unreadCount === 0) {
    return null
  }

  return (
    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-semantic-critical text-white text-xs font-medium">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  )
}
