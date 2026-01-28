import { PrismaClient } from '@prisma/client'
import { DEFAULT_TEMPLATES } from '../src/lib/event-templates'

const prisma = new PrismaClient()

async function seedEventTemplates() {
  console.log('Seeding event templates...')

  for (let index = 0; index < DEFAULT_TEMPLATES.length; index++) {
    const template = DEFAULT_TEMPLATES[index]
    const existing = await prisma.eventTemplate.findUnique({
      where: { type: template.type },
    })

    if (existing) {
      // Update existing template
      await prisma.eventTemplate.update({
        where: { type: template.type },
        data: {
          label: template.label,
          emoji: template.emoji,
          defaultSeverity: template.defaultSeverity,
          configuration: template as any,
          order: index,
          active: true,
        },
      })
      console.log(`✓ Updated template: ${template.type}`)
    } else {
      // Create new template
      await prisma.eventTemplate.create({
        data: {
          type: template.type,
          label: template.label,
          emoji: template.emoji,
          defaultSeverity: template.defaultSeverity,
          configuration: template as any,
          order: index,
          active: true,
        },
      })
      console.log(`✓ Created template: ${template.type}`)
    }
  }

  console.log('\nEvent templates seeded successfully!')
  console.log(`Total templates: ${DEFAULT_TEMPLATES.length}`)
}

seedEventTemplates()
  .catch((error) => {
    console.error('Error seeding event templates:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
