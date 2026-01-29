import AppointmentsClient from './appointments-client'

export const dynamicParams = true

export async function generateStaticParams() {
  return [{ caseId: '_placeholder_' }]
}

export default async function AppointmentsPage() {
  return <AppointmentsClient />
}
