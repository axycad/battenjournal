# Batten Journal

A healthcare tracking application for families affected by Batten disease (NCL). Built to help parents and clinicians collaborate on care documentation.

## Features

- **Event Logging**: Track seizures, sleep, feeding, medications, and daily observations
- **Scope-Based Sharing**: Control what clinicians can see based on their specialty
- **Medication Tracking**: Log scheduled and PRN medication administration
- **Care Team Messaging**: Threaded discussions between family and clinicians
- **Password Reset**: Email-based reset flow for account recovery
- **Offline Support**: PWA with IndexedDB for offline event logging
- **Data Export**: JSON/CSV export with audit trails
- **Emergency Card**: Quick-reference card with allergies, medications, contacts

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: Auth.js v5 (credentials)
- **Styling**: Tailwind CSS
- **Offline**: Dexie (IndexedDB) + Service Worker
- **Testing**: Jest + React Testing Library

## Quick Start

```bash
# Clone and install
git clone <repo>
cd batten-journal
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your database URL and secrets
# SMTP settings are required for password reset emails

# Setup database
npm run db:generate
npm run db:push
npm run db:seed

# Start development server
npm run dev
```

Visit http://localhost:5000

## Demo Accounts

Seed demo data with `SEED_DEMO=true npm run db:seed`:

| Role | Email | Password |
|------|-------|----------|
| Parent | demo@battenjournal.com | demodemo123 |
| Partner | partner@battenjournal.com | demodemo123 |
| Clinician | doctor@battenjournal.com | demodemo123 |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm test` | Run tests |
| `npm run test:coverage` | Run tests with coverage |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed scopes (and demo data if SEED_DEMO=true) |
| `npm run db:studio` | Open Prisma Studio |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/             # Authenticated routes
│   │   ├── case/[caseId]/ # Case-specific pages
│   │   ├── dashboard/     # Main dashboard
│   │   ├── notifications/ # Notification center
│   │   └── settings/      # User settings
│   ├── (auth)/            # Login/register
│   ├── api/               # API routes
│   └── ...
├── actions/               # Server actions
├── components/            # React components
│   ├── medications/       # Medication tracking
│   ├── messaging/         # Care team messaging
│   ├── notifications/     # Notification badges
│   ├── offline/           # Offline UI components
│   └── ui/                # Base UI components
└── lib/                   # Utilities
    ├── offline/           # IndexedDB + sync
    └── ...
```

## Documentation

- [Deployment Guide](./DEPLOYMENT.md)

## License

Private - Anisia's Hope Foundation

## Contributing

This project is developed for Anisia's Hope - Fighting Batten Disease. Contact the maintainers for contribution guidelines.
