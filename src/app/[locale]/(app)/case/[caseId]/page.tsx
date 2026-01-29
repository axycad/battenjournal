import CaseClient from './case-client'

export const dynamicParams = true

export async function generateStaticParams() {
  return [{ caseId: '_placeholder_' }]
}

export default async function CasePage() {
  return <CaseClient />
}
