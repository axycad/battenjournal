# Database Migration Instructions

## What's Missing
The new features require 3 new database tables that don't exist yet:
1. **Appointment** - Stores appointments with calendar sync
2. **Notification** - In-app notification center
3. **ReminderLog** - Prevents duplicate reminder sends

Plus updates to the **EmailPreference** table for reminder settings.

## How to Apply Migrations

### Option 1: Automatic Migration (Recommended)

Run this in your terminal (in the project directory):

```bash
npx prisma migrate dev --name add_appointments_and_reminders
```

This will:
- Create migration files
- Apply them to your database
- Update Prisma Client

### Option 2: Manual SQL (if automatic fails)

If you prefer to review the SQL first, here's what will be created:

```sql
-- Add Appointment table
CREATE TABLE "Appointment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "caseId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "appointmentType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "duration" INTEGER,
  "location" TEXT,
  "provider" TEXT,
  "reminderTimes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Appointment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE,
  CONSTRAINT "Appointment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
);

CREATE INDEX "Appointment_caseId_idx" ON "Appointment"("caseId");
CREATE INDEX "Appointment_scheduledAt_idx" ON "Appointment"("scheduledAt");
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- Add Notification table
CREATE TABLE "Notification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "actionUrl" TEXT,
  "metadata" JSONB,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_readAt_idx" ON "Notification"("readAt");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- Add ReminderLog table
CREATE TABLE "ReminderLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "reminderType" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReminderLog_userId_reminderType_referenceId_scheduledFor_key" UNIQUE ("userId", "reminderType", "referenceId", "scheduledFor")
);

CREATE INDEX "ReminderLog_userId_idx" ON "ReminderLog"("userId");
CREATE INDEX "ReminderLog_scheduledFor_idx" ON "ReminderLog"("scheduledFor");

-- Update EmailPreference table (add new columns)
ALTER TABLE "EmailPreference"
  ADD COLUMN "medicationReminders" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "appointmentReminders" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "dailyLoggingNudges" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "quietHoursStart" TEXT,
  ADD COLUMN "quietHoursEnd" TEXT;
```

Then run:
```bash
npx prisma generate
```

## After Migration

1. Restart your dev server:
```bash
npm run dev
```

2. Check the new features:
- Go to `/case/[caseId]/today` - you should see "Add appointment" button
- Go to `/settings/notifications` - you should see reminder preferences
- The appointment widget will appear once you add an appointment

## Troubleshooting

If you see "Table does not exist" errors:
- Make sure migrations ran successfully
- Check your database connection in `.env`
- Try `npx prisma db push` as a fallback

If appointments don't show up:
- Check the browser console for errors
- Make sure you're logged in as a PARENT member
- Try refreshing the page

## Testing the Reminders

Reminders won't trigger automatically yet. To test:

1. Add a medication with reminder times in `/case/[caseId]/medications`
2. Create an appointment with reminder offsets
3. Set up a cron job to call `/api/cron/reminders` every 10 minutes

Or manually test the endpoint:
```bash
curl http://localhost:3000/api/cron/reminders
```
