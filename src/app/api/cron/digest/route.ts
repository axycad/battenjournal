import { NextRequest, NextResponse } from 'next/server'
import {
  getUsersDueForDigest,
  generateDigestEmail,
  markDigestSent,
  type DigestFrequency,
} from '@/actions/email-notifications'
import { prisma } from '@/lib/prisma'

// This endpoint is called by a cron job to send email digests
// Configure in vercel.json:
// {
//   "crons": [
//     { "path": "/api/cron/digest?frequency=IMMEDIATE", "schedule": "0 * * * *" },
//     { "path": "/api/cron/digest?frequency=DAILY", "schedule": "0 8 * * *" },
//     { "path": "/api/cron/digest?frequency=WEEKLY", "schedule": "0 8 * * 1" }
//   ]
// }

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const frequency = searchParams.get('frequency') as DigestFrequency | null

  if (!frequency || !['IMMEDIATE', 'DAILY', 'WEEKLY'].includes(frequency)) {
    return NextResponse.json(
      { error: 'Valid frequency required (IMMEDIATE, DAILY, WEEKLY)' },
      { status: 400 }
    )
  }

  try {
    const userIds = await getUsersDueForDigest(frequency)

    if (userIds.length === 0) {
      return NextResponse.json({ message: 'No users due for digest', sent: 0 })
    }

    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (const userId of userIds) {
      try {
        const email = await generateDigestEmail(userId)

        if (!email) {
          // No content to send
          continue
        }

        // Get user email
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        })

        if (!user?.email) {
          continue
        }

        // Send email using your preferred provider
        // Example with Resend:
        // await resend.emails.send({
        //   from: 'Batten Journal <notifications@battenjournal.com>',
        //   to: user.email,
        //   subject: email.subject,
        //   html: email.html,
        //   text: email.text,
        // })

        // For now, just log (replace with actual email sending)
        console.log(`[Digest] Would send to ${user.email}: ${email.subject}`)

        await markDigestSent(userId)
        sent++
      } catch (error) {
        failed++
        errors.push(`User ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        console.error(`Failed to send digest to user ${userId}:`, error)
      }
    }

    return NextResponse.json({
      message: `Digest processing complete`,
      frequency,
      eligible: userIds.length,
      sent,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Digest cron error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Vercel Cron uses GET, but POST can be used for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
