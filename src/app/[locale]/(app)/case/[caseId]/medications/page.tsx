import MedicationsClient from './medications-client'

export const dynamicParams = true

export async function generateStaticParams() {
  return [{ caseId: '_placeholder_' }]
}

export default async function MedicationsPage() {
  return <MedicationsClient />
}
