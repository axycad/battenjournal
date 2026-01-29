import DocumentsClient from './documents-client'

export const dynamicParams = true

export async function generateStaticParams() {
  return [{ caseId: '_placeholder_' }]
}

export default async function DocumentsPage() {
  return <DocumentsClient />
}
