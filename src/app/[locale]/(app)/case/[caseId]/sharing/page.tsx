import SharingClient from './sharing-client'

export const dynamicParams = true

export async function generateStaticParams() {
  return [{ caseId: '_placeholder_' }]
}

export default async function SharingPage() {
  return <SharingClient />
}
