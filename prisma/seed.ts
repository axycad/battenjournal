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

  // Create demo clinician (NO specialty field on User model)
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

  // Create demo case (NO legalName, dateOfBirth, nhsNumber - those are on PatientProfile)
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

  // Create patient profile (this is where personal details go)
  await prisma.patientProfile.upsert({
    where: { caseId: demoCase.id },
    update: {},
    create: {
      caseId: demoCase.id,
      legalName: 'Emma Demo',
      dateOfBirth: new Date('2020-06-15'),
      nationalId: '123 456 7890',
      visionStatus: 'REDUCED',
      mobilityStatus: 'WHEELCHAIR',
      communicationStatus: 'NON_VERBAL',
      feedingStatus: 'TUBE',
      emergencyNotes: 'PEG-fed, non-verbal, uses wheelchair. Responds to music and familiar voices.',
    },
  })

  // Create care intent
  await prisma.careIntent.upsert({
    where: { caseId: demoCase.id },
    update: {},
    create: {
      caseId: demoCase.id,
      updatedByUserId: parent.id,
      communicationNotes: 'Smiles for yes, looks away for no. Loves music.',
      keyEquipment: 'Suction machine, PEG supplies, wheelchair, sleep system',
      preferredHospital: 'Great Ormond Street Hospital',
    },
  })

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

  // Create consent (Consent uses caseId + consentType, NOT membershipId)
  const existingConsent = await prisma.consent.findFirst({
    where: { 
      caseId: demoCase.id,
      consentType: 'CLINICAL',
    },
  })

  const consent = existingConsent ?? await prisma.consent.create({
    data: {
      caseId: demoCase.id,
      consentType: 'CLINICAL',
      status: 'ACTIVE',
      grantedAt: new Date(),
    },
  })

  // Get scopes for permission grants
  const scopeRecords = await prisma.scope.findMany({
    where: { code: { in: ['seizures', 'meds', 'comfort', 'care_admin'] } },
  })

  for (const scope of scopeRecords) {
    const existingGrant = await prisma.permissionGrant.findFirst({
      where: {
        membershipId: clinicianMembership.id,
        scopeId: scope.id,
      },
    })

    if (!existingGrant) {
      await prisma.permissionGrant.create({
        data: {
          membershipId: clinicianMembership.id,
          consentId: consent.id,
          scopeId: scope.id,
          accessMode: 'VIEW',
        },
      })
    }
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

  // Add demo conditions (NO diagnosedDate field - only name and notes)
  await prisma.condition.upsert({
    where: { id: 'demo-condition-001' },
    update: {},
    create: {
      id: 'demo-condition-001',
      caseId: demoCase.id,
      name: 'CLN2 Batten Disease',
      notes: 'Late infantile onset, confirmed by enzyme assay and genetic testing. Diagnosed January 2023.',
    },
  })

  await prisma.condition.upsert({
    where: { id: 'demo-condition-002' },
    update: {},
    create: {
      id: 'demo-condition-002',
      caseId: demoCase.id,
      name: 'Epilepsy',
      notes: 'Myoclonic and tonic-clonic seizures. Diagnosed March 2023.',
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
      address: 'Great Ormond Street Hospital, London',
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

  // Add demo events (last 7 days)
  const seizureScope = await prisma.scope.findUnique({ where: { code: 'seizures' } })
  const sleepScope = await prisma.scope.findUnique({ where: { code: 'sleep' } })
  const feedingScope = await prisma.scope.findUnique({ where: { code: 'feeding' } })
  const comfortScope = await prisma.scope.findUnique({ where: { code: 'comfort' } })

  const eventData = [
    {
      id: 'demo-event-001',
      eventType: 'seizure',
      freeText: 'Myoclonic jerks on waking, lasted about 2 minutes. Settled after cuddles.',
      occurredAt: daysAgo(0, 7, 30),
      severity: 2, // MILD
      scopes: [seizureScope?.id],
    },
    {
      id: 'demo-event-002',
      eventType: 'sleep',
      freeText: 'Slept well through the night. Woke once at 3am but settled quickly.',
      occurredAt: daysAgo(1, 8, 0),
      severity: 2, // MILD
      scopes: [sleepScope?.id],
    },
    {
      id: 'demo-event-003',
      eventType: 'feeding',
      freeText: 'PEG feed completed without issues. Tried some pureed banana - enjoyed it!',
      occurredAt: daysAgo(1, 12, 30),
      severity: 1, // MINIMAL
      scopes: [feedingScope?.id],
    },
    {
      id: 'demo-event-004',
      eventType: 'seizure',
      freeText: 'Tonic-clonic seizure at school, 3 minutes. Midazolam given. Recovery in 20 mins.',
      occurredAt: daysAgo(2, 14, 15),
      severity: 3, // MODERATE
      scopes: [seizureScope?.id],
    },
    {
      id: 'demo-event-005',
      eventType: 'comfort',
      freeText: 'Seemed uncomfortable after lunch. Position change helped. May need physio review.',
      occurredAt: daysAgo(3, 13, 0),
      severity: 2, // MILD
      scopes: [comfortScope?.id],
    },
    {
      id: 'demo-event-006',
      eventType: 'general',
      freeText: 'Good day overall. Enjoyed music therapy session. Very responsive to favourite songs.',
      occurredAt: daysAgo(4, 16, 0),
      severity: 1, // MINIMAL
      scopes: [comfortScope?.id],
    },
    {
      id: 'demo-event-007',
      eventType: 'sleep',
      freeText: 'Restless night, woke several times. May be teething.',
      occurredAt: daysAgo(5, 7, 0),
      severity: 2, // MILD
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
        severity: event.severity,
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

  // Add demo appointments
  await prisma.appointment.upsert({
    where: { id: 'demo-appointment-001' },
    update: {},
    create: {
      id: 'demo-appointment-001',
      caseId: demoCase.id,
      createdByUserId: parent.id,
      appointmentType: 'NEUROLOGY',
      title: 'Dr. Chen follow-up',
      notes: 'Regular check-up, discuss recent seizure activity',
      scheduledAt: daysAgo(-7, 10, 0), // 7 days from now at 10am
      duration: 60,
      location: 'Great Ormond Street Hospital',
      provider: 'Dr. Emily Chen',
      reminderTimes: JSON.stringify([1440, 60]), // 1 day and 1 hour before
      status: 'SCHEDULED',
    },
  })

  await prisma.appointment.upsert({
    where: { id: 'demo-appointment-002' },
    update: {},
    create: {
      id: 'demo-appointment-002',
      caseId: demoCase.id,
      createdByUserId: parent.id,
      appointmentType: 'INFUSION',
      title: 'Brineura infusion',
      notes: 'Regular enzyme replacement therapy',
      scheduledAt: daysAgo(-14, 9, 30), // 14 days from now at 9:30am
      duration: 240, // 4 hours
      location: 'Great Ormond Street Hospital - Day Unit',
      provider: 'Infusion Team',
      reminderTimes: JSON.stringify([4320, 1440]), // 3 days and 1 day before
      status: 'SCHEDULED',
    },
  })

  await prisma.appointment.upsert({
    where: { id: 'demo-appointment-003' },
    update: {},
    create: {
      id: 'demo-appointment-003',
      caseId: demoCase.id,
      createdByUserId: parent.id,
      appointmentType: 'PHYSICAL_THERAPY',
      title: 'Physio session',
      scheduledAt: daysAgo(-2, 14, 0), // 2 days from now at 2pm
      duration: 45,
      location: 'Local therapy centre',
      reminderTimes: JSON.stringify([60]), // 1 hour before
      status: 'SCHEDULED',
    },
  })

  console.log('Created 3 demo appointments')
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
