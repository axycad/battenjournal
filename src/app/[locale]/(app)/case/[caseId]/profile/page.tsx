import ProfileClient from './profile-client'

export const dynamicParams = true

export async function generateStaticParams() {
  return [{ caseId: '_placeholder_' }]
}

export default async function ProfilePage() {
  return <ProfileClient />
}
