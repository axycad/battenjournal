import SettingsClient from './settings-client'

export const dynamicParams = true

export async function generateStaticParams() {
  return [{ caseId: '_placeholder_' }]
}

export default async function SettingsPage() {
  return <SettingsClient />
}
