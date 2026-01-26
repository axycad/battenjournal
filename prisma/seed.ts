import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Seed scopes (always run)
  const scopes = [
    { id: 'seizures', name: 'Seizures', description: 'Seizure events and triggers' },
    { id: 'skin_wounds', name: 'Skin & Wounds', description: 'Skin conditions and wound care' },
    { id: 'infection', name: 'Infection Signs', description: 'Temperature, illness symptoms' },
    { id: 'meds', name: 'Medications', description: 'Medication administration' },
    { id: 'feeding', name: 'Feeding & Nutrition', description: 'Feeding, hydration, weight' },
    { id: 'sleep', name: 'Sleep', description: 'Sleep patterns and quality' },
    { id: 'mobility', name: 'Mobility & Physio', description: 'Movement, positioning, therapy' },
    { id: 'vision_comm', name: 'Vision & Communication', description: 'Visual response, communication' },
    { id: 'comfort', name: 'Comfort & Wellbeing', description: 'Pain, mood, comfort measures' },
    { id: 'care_admin', name: 'Care Admin', description: 'Appointments, contacts, admin' },
    { id: 'other', name: 'Other', description: 'General observations' },
  ]

  for (const scope of scopes) {
    await prisma.scope.upsert({
      where: { id: scope.id },
      update: {},
      create: scope,
    })
  }
  console.log('Seeded scopes')

  // Demo data only if SEED_DEMO is set
  if (process.env.SEED_DEMO !== 'true') {
    console.log('Skipping demo data (set SEED_DEMO=true to include)')
    return
  }

  const passwordHash = await hash('demodemo123', 12)

  // Create demo users
  const parent = await prisma.user.upsert({
    where: { email: 'demo@battenjournal.com' },
    update: {},
    create: {
      email: 'demo@battenjournal.com',
      name: 'Demo Parent',
      passwordHash,
      role: 'PARENT',
    },
  })
  console.log(`Created parent: ${parent.email}`)

  const partner = await prisma.user.upsert({
    where: { email: 'partner@battenjournal.com' },
    update: {},
    create: {
      email: 'partner@battenjournal.com',
      name: 'Demo Partner',
      passwordHash,
      role: 'PARENT',
    },
  })
  console.log(`Created partner: ${partner.email}`)

  const clinician = await prisma.user.upsert({
    where: { email: 'doctor@battenjournal.com' },
    update: {},
    create: {
      email: 'doctor@battenjournal.com',
      name: 'Dr. Emily Chen',
      passwordHash,
      role: 'CLINICIAN',
    },
  })
  console.log(`Created clinician: ${clinician.email}`)

  // Create demo case
  const demoCase = await prisma.case.upsert({
    where: { id: 'demo-case-001' },
    update: {},
    create: {
      id: 'demo-case-001',
      childDisplayName: 'Emma',
      diseaseProfileVersion: 'CLN2',
    },
  })
  console.log(`Created case: ${demoCase.childDisplayName}`)

  // Create memberships
  await prisma.membership.upsert({
    where: { id: 'membership-parent' },
    update: {},
    create: {
      id: 'membership-parent',
      userId: parent.id,
      caseId: demoCase.id,
      role: 'OWNER_ADMIN',
    },
  })

  await prisma.membership.upsert({
    where: { id: 'membership-partner' },
    update: {},
    create: {
      id: 'membership-partner',
      userId: partner.id,
      caseId: demoCase.id,
      role: 'EDITOR',
    },
  })

  await prisma.membership.upsert({
    where: { id: 'membership-clinician' },
    update: {},
    create: {
      id: 'membership-clinician',
      userId: clinician.id,
      caseId: demoCase.id,
      role: 'CARE_TEAM',
      specialty: 'NEUROLOGY',
    },
  })

  console.log('Created memberships')
  console.log('Demo data seeded successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
