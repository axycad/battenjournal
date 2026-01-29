import MessagesClient from './messages-client'

export const dynamicParams = true

export async function generateStaticParams() {
  return [{ caseId: '_placeholder_' }]
}

export default async function MessagesPage() {
  return <MessagesClient />
}
