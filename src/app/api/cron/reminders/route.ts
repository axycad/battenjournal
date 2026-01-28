import { NextResponse } from 'next/server'
import { processAllReminders } from '@/lib/reminder-service'

/**
 * Cron endpoint for processing reminders
 * Should be called every 5-15 minutes by a cron service like Vercel Cron or external scheduler
 *
 * Security: In production, verify the request comes from your cron service
 * using a secret token or Vercel's cron secret header
 */
export async function GET(request: Request) {
  try {
    // Optional: Verify cron authorization
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Process all reminders
    const results = await processAllReminders()

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[CRON] Error processing reminders:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Optionally support POST as well
export async function POST(request: Request) {
  return GET(request)
}
