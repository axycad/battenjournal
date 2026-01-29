import TrendsClient from './trends-client'

export const dynamicParams = true

export async function generateStaticParams() {
  // Only return caseId - locale is handled by parent [locale] segment
  return [{ caseId: '_placeholder_' }]
}

export default async function TrendsPage() {
  return <TrendsClient />
}
