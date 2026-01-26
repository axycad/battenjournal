import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Seed scopes (always run)
  const scopes = [
    { id: 'seizures', code: 'seizures', label: 'Seizures' },
    { id: 'skin_wounds', code: 'skin_wounds', label: 'Skin & Wounds' },
    { id: 'infection', code: 'infection', label: 'Infection Signs' },
    { id: 'meds', code: 'meds', label: 'Medications' },
    { id: 'feeding', code: 'feeding', label: 'Feeding & Nutrition' },
    { id: 'sleep', code: 'sleep', label: 'Sleep' },
    { id: 'mobility', code: 'mobility', label: 'Mobility & Physio' },
    { id: 'vision_comm', code: 'vision_comm', label: 'Vision & Communication' },
    { id: 'comfort', code: 'comfort', label: 'Comfort & Wellbeing' },
    { id: 'care_admin', code: 'care_admin', label: 'Care Admin' },
    { id: 'other', code: 'other', label: 'Other' },
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
