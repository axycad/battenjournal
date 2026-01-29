// Only set dynamic for web builds, not Capacitor static export
export const dynamic = process.env.CAPACITOR_BUILD ? undefined : 'force-dynamic'

export async function GET() {
  return new Response('OK', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}
