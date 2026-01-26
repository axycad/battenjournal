import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Scope taxonomy from system diagram section 6.1
const scopes = [
  { code: 'seizures', label: 'Seizure activity' },
  { code: 'skin_wounds', label: 'Skin and wounds' },
  { code: 'infection', label: 'Infection concerns' },
  { code: 'meds', label: 'Medications' },
  { code: 'feeding', label: 'Feeding and nutrition' },
  { code: 'sleep', label: 'Sleep patterns' },
  { code: 'mobility', label: 'Mobility and movement' },
  { code: 'vision_comm', label: 'Vision and communication' },
  { code: 'comfort', label: 'Comfort and pain' },
  { code: 'care_admin', label: 'Care administration' },
  { code: 'other', label: 'Other observations' },
]

// Demo data for testing
const DEMO_PASSWORD = 'demodemo123'

async function seedScopes() {
  console.log('Seeding scopes...')
  
  for (const scope of scopes) {
    await prisma.scope.upsert({
      where: { code: scope.code },
      update: { label: scope.label },
      create: scope,
    })
  }
  
  console.log(`Seeded ${scopes.length} scopes`)
}

async function seedDemoData() {
  console.log('Seeding demo data...')
  
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)
  
  // Create demo parent user
  const parent = await prisma.user.upsert({
    where: { email: 'demo@battenjournal.com' },
    update: {},
    create: {
      email: 'demo@battenjournal.com',
      name: 'Sarah Demo',
      passwordHash,
      role: 'PARENT',
    },
  })
  console.log(`Created parent: ${parent.email}`)

  // Create second parent (partner)
  const partner = await prisma.user.upsert({
    where: { email: 'partner@battenjournal.com' },
    update: {},
    create: {
      email: 'partner@battenjournal.com',
      name: 'James Demo',
      passwordHash,
      role: 'PARENT',
    },
  })
  console.log(`Created partner: ${partner.email}`)

  // Create demo clinician
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
    where: {
      caseId_userId: { caseId: demoCase.id, userId: parent.id },
    },
    update: {},
    create: {
      caseId: demoCase.id,
      userId: parent.id,
      memberType: 'PARENT',
      familyRole: 'OWNER_ADMIN',
    },
  })

  await prisma.membership.upsert({
    where: {
      caseId_userId: { caseId: demoCase.id, userId: partner.id },
    },
    update: {},
    create: {
      caseId: demoCase.id,
      userId: partner.id,
      memberType: 'PARENT',
      familyRole: 'EDITOR',
    },
  })

  const clinicianMembership = await prisma.membership.upsert({
    where: {
      caseId_userId: { caseId: demoCase.id, userId: clinician.id },
    },
    update: {},
    create: {
      caseId: demoCase.id,
      userId: clinician.id,
      memberType: 'CARE_TEAM',
    },
  })

  // Create consent for clinician
  const consent = await prisma.consent.upsert({
    where: { membershipId: clinicianMembership.id },
    update: {},
    create: {
      caseId: demoCase.id,
      membershipId: clinicianMembership.id,
      status: 'ACTIVE',
      grantedAt: new Date(),
    },
  })

  // Get scopes for permission grants
  const scopeRecords = await prisma.scope.findMany({
    where: { code: { in: ['seizures', 'meds', 'comfort', 'care_admin'] } },
  })

  for (const scope of scopeRecords) {
    await prisma.permissionGrant.upsert({
      where: {
        membershipId_scopeId: {
          membershipId: clinicianMembership.id,
          scopeId: scope.id,
        },
      },
      update: {},
      create: {
        membershipId: clinicianMembership.id,
        consentId: consent.id,
        scopeId: scope.id,
      },
    })
  }

  // Add demo allergies
  await prisma.allergy.upsert({
    where: { id: 'demo-allergy-001' },
    update: {},
    create: {
      id: 'demo-allergy-001',
      caseId: demoCase.id,
      substance: 'Penicillin',
      severity: 'SEVERE',
      reaction: 'Anaphylaxis - carry EpiPen',
    },
  })

  await prisma.allergy.upsert({
    where: { id: 'demo-allergy-002' },
    update: {},
    create: {
      id: 'demo-allergy-002',
      caseId: demoCase.id,
      substance: 'Latex',
      severity: 'MODERATE',
      reaction: 'Skin rash',
    },
  })

  // Add demo medications
  await prisma.medication.upsert({
    where: { id: 'demo-med-001' },
    update: {},
    create: {
      id: 'demo-med-001',
      caseId: demoCase.id,
      name: 'Levetiracetam',
      dose: '250mg',
      route: 'Oral',
      schedule: 'Twice daily (8am, 8pm)',
      isPRN: false,
      reminderEnabled: true,
      reminderTimes: JSON.stringify(['08:00', '20:00']),
    },
  })

  await prisma.medication.upsert({
    where: { id: 'demo-med-002' },
    update: {},
    create: {
      id: 'demo-med-002',
      caseId: demoCase.id,
      name: 'Midazolam',
      dose: '5mg buccal',
      route: 'Buccal',
      isPRN: true,
    },
  })

  await prisma.medication.upsert({
    where: { id: 'demo-med-003' },
    update: {},
    create: {
      id: 'demo-med-003',
      caseId: demoCase.id,
      name: 'Melatonin',
      dose: '2mg',
      route: 'Oral',
      schedule: 'At bedtime',
      isPRN: false,
    },
  })

  // Add demo conditions
  await prisma.condition.upsert({
    where: { id: 'demo-condition-001' },
    update: {},
    create: {
      id: 'demo-condition-001',
      caseId: demoCase.id,
      name: 'CLN2 Batten Disease',
      diagnosedDate: new Date('2023-01-15'),
      notes: 'Late infantile onset, confirmed by enzyme assay and genetic testing',
    },
  })

  await prisma.condition.upsert({
    where: { id: 'demo-condition-002' },
    update: {},
    create: {
      id: 'demo-condition-002',
      caseId: demoCase.id,
      name: 'Epilepsy',
      diagnosedDate: new Date('2023-03-01'),
      notes: 'Myoclonic and tonic-clonic seizures',
    },
  })

  // Add demo care contacts
  await prisma.careContact.upsert({
    where: { id: 'demo-contact-001' },
    update: {},
    create: {
      id: 'demo-contact-001',
      caseId: demoCase.id,
      role: 'Neurologist',
      name: 'Dr. Emily Chen',
      phone: '020 7123 4567',
      address: "Great Ormond Street Hospital, London",
    },
  })

  await prisma.careContact.upsert({
    where: { id: 'demo-contact-002' },
    update: {},
    create: {
      id: 'demo-contact-002',
      caseId: demoCase.id,
      role: 'Community Nurse',
      name: 'Jane Wilson',
      phone: '07700 900123',
    },
  })

  // Add baseline
  await prisma.baseline.upsert({
    where: { caseId: demoCase.id },
    update: {},
    create: {
      caseId: demoCase.id,
      vision: 'Limited - responds to high contrast objects and bright lights',
      mobility: 'Uses wheelchair, can weight-bear with support for transfers',
      communication: 'Non-verbal, uses eye gaze and facial expressions',
      feeding: 'PEG-fed, small amounts of pureed food orally for pleasure',
      communicationNotes: 'Smiles for yes, looks away for no. Loves music.',
      keyEquipment: 'Suction machine, PEG supplies, wheelchair, sleep system',
    },
  })

  // Add demo events (last 7 days)
  const seizureScope = await prisma.scope.findUnique({ where: { code: 'seizures' } })
  const sleepScope = await prisma.scope.findUnique({ where: { code: 'sleep' } })
  const feedingScope = await prisma.scope.findUnique({ where: { code: 'feeding' } })
  const comfortScope = await prisma.scope.findUnique({ where: { code: 'comfort' } })

  const eventData = [
    {
      id: 'demo-event-001',
      eventType: 'SEIZURE',
      freeText: 'Myoclonic jerks on waking, lasted about 2 minutes. Settled after cuddles.',
      occurredAt: daysAgo(0, 7, 30),
      scopes: [seizureScope?.id],
    },
    {
      id: 'demo-event-002',
      eventType: 'SLEEP',
      freeText: 'Slept well through the night. Woke once at 3am but settled quickly.',
      occurredAt: daysAgo(1, 8, 0),
      scopes: [sleepScope?.id],
    },
    {
      id: 'demo-event-003',
      eventType: 'FEEDING',
      freeText: 'PEG feed completed without issues. Tried some pureed banana - enjoyed it!',
      occurredAt: daysAgo(1, 12, 30),
      scopes: [feedingScope?.id],
    },
    {
      id: 'demo-event-004',
      eventType: 'SEIZURE',
      freeText: 'Tonic-clonic seizure at school, 3 minutes. Midazolam given. Recovery in 20 mins.',
      occurredAt: daysAgo(2, 14, 15),
      scopes: [seizureScope?.id],
    },
    {
      id: 'demo-event-005',
      eventType: 'COMFORT',
      freeText: 'Seemed uncomfortable after lunch. Position change helped. May need physio review.',
      occurredAt: daysAgo(3, 13, 0),
      scopes: [comfortScope?.id],
    },
    {
      id: 'demo-event-006',
      eventType: 'GENERAL',
      freeText: 'Good day overall. Enjoyed music therapy session. Very responsive to favourite songs.',
      occurredAt: daysAgo(4, 16, 0),
      scopes: [comfortScope?.id],
    },
    {
      id: 'demo-event-007',
      eventType: 'SLEEP',
      freeText: 'Restless night, woke several times. May be teething.',
      occurredAt: daysAgo(5, 7, 0),
      scopes: [sleepScope?.id],
    },
  ]

  for (const event of eventData) {
    const created = await prisma.event.upsert({
      where: { id: event.id },
      update: {},
      create: {
        id: event.id,
        caseId: demoCase.id,
        authorUserId: parent.id,
        eventType: event.eventType,
        freeText: event.freeText,
        occurredAt: event.occurredAt,
        loggedAt: event.occurredAt,
      },
    })

    // Add scopes
    for (const scopeId of event.scopes.filter(Boolean)) {
      await prisma.eventScope.upsert({
        where: {
          eventId_scopeId: { eventId: created.id, scopeId: scopeId! },
        },
        update: {},
        create: {
          eventId: created.id,
          scopeId: scopeId!,
        },
      })
    }
  }

  console.log(`Created ${eventData.length} demo events`)
  console.log('')
  console.log('=== Demo Accounts ===')
  console.log(`Parent: demo@battenjournal.com / ${DEMO_PASSWORD}`)
  console.log(`Partner: partner@battenjournal.com / ${DEMO_PASSWORD}`)
  console.log(`Clinician: doctor@battenjournal.com / ${DEMO_PASSWORD}`)
  console.log('')
}

function daysAgo(days: number, hour: number, minute: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, minute, 0, 0)
  return date
}

async function main() {
  await seedScopes()
  
  // Only seed demo data if SEED_DEMO env var is set
  if (process.env.SEED_DEMO === 'true') {
    await seedDemoData()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
