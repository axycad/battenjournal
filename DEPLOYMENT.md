# Batten Journal - Deployment Guide

## Prerequisites

- Node.js 18+
- PostgreSQL database (Neon, Supabase, or self-hosted)
- Vercel account (recommended) or other Node.js hosting

## Environment Variables

Create a `.env.local` file for development or configure in your hosting provider:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/batten_journal?sslmode=require"

# Auth.js
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="https://your-domain.com"

# File Storage (local development)
UPLOAD_DIR="./uploads"

# Email Digest Cron (optional)
CRON_SECRET="generate-a-secure-random-string"

# Demo mode (optional)
SEED_DEMO="true"
```

### Generating AUTH_SECRET

```bash
openssl rand -base64 32
```

## Local Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed scopes (required)
npm run db:seed

# Seed demo data (optional)
SEED_DEMO=true npm run db:seed

# Start development server
npm run dev
```

Visit http://localhost:5000

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Deployment to Vercel

### 1. Connect Repository

Link your GitHub repository to Vercel.

### 2. Configure Environment Variables

In Vercel dashboard, add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your PostgreSQL connection string |
| `AUTH_SECRET` | Generated secret |
| `AUTH_URL` | `https://your-app.vercel.app` |
| `SMTP_HOST` | SMTP host (if using SMTP) |
| `SMTP_PORT` | SMTP port, e.g. `587` |
| `SMTP_SECURE` | `true` for TLS/465 else `false` |
| `SMTP_USER` | SMTP username (optional for open relay) |
| `SMTP_PASS` | SMTP password (optional for open relay) |
| `SMTP_FROM` | Sender address, e.g. `Batten Journal <no-reply@...>` |
| `RESEND_API_KEY` | Resend API key (alternative to SMTP) |
| `RESEND_FROM` | Verified sender for Resend |
| `CRON_SECRET` | Generated secret (for email digests) |

### 3. Configure Build

Vercel auto-detects Next.js. No changes needed.

### 4. Deploy

Push to main branch or trigger manual deploy.

### 5. Run Migrations

After first deploy, run in Vercel terminal or locally:

```bash
npx prisma db push
npm run db:seed
```

## Database Setup (Neon)

1. Create account at neon.tech
2. Create new project
3. Copy connection string to `DATABASE_URL`
4. Connection string format:
   ```
   postgresql://[user]:[password]@[host]/[database]?sslmode=require
   ```

## Email Digest Setup (Optional)

### 1. Add Email Provider

Install Resend (or your preferred provider):

```bash
npm install resend
```

### 2. Configure Cron Jobs

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/digest?frequency=IMMEDIATE",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/digest?frequency=DAILY",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/digest?frequency=WEEKLY",
      "schedule": "0 8 * * 1"
    }
  ]
}
```

### 3. Update Cron Endpoint

Edit `/src/app/api/cron/digest/route.ts` to use your email provider.

## File Storage

### Development (Local)

Files stored in `./uploads` directory. Add to `.gitignore`.

### Production Options

1. **Vercel Blob** - Simplest for Vercel deployments
2. **AWS S3** - Most flexible
3. **Cloudflare R2** - Cost-effective

Update `src/lib/storage.ts` to use your chosen provider.

## PWA Configuration

The app includes PWA support:

- `public/manifest.json` - App manifest
- `public/sw.js` - Service worker
- `public/icons/` - App icons

For production, update manifest.json with your app details.

## Demo Accounts

When seeded with `SEED_DEMO=true`:

| Role | Email | Password |
|------|-------|----------|
| Parent (Admin) | demo@battenjournal.com | demodemo123 |
| Parent (Editor) | partner@battenjournal.com | demodemo123 |
| Clinician | doctor@battenjournal.com | demodemo123 |

## Health Check

Verify deployment:

1. Visit `/login` - Should show login form
2. Login with demo account
3. Check `/dashboard` - Should show case list
4. Verify database connection in Vercel logs

## Troubleshooting

### Database Connection Errors

- Verify `DATABASE_URL` is correct
- Check IP allowlist in database provider
- Ensure SSL mode is enabled

### Auth Errors

- Verify `AUTH_SECRET` is set
- Check `AUTH_URL` matches actual domain
- Clear cookies and retry

### Build Failures

```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

## Monitoring

Recommended:

- Vercel Analytics (built-in)
- Sentry for error tracking
- Database metrics from provider

## Security Checklist

- [ ] AUTH_SECRET is unique and secure
- [ ] CRON_SECRET is set for digest endpoint
- [ ] Database has SSL enabled
- [ ] Environment variables not in code
- [ ] CORS configured appropriately
- [ ] Rate limiting on auth endpoints
