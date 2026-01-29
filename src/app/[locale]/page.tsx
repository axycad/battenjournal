import { Link } from '@/navigation'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const session = await auth()

  // Redirect authenticated users to dashboard
  if (session?.user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      {/* Header */}
      <header className="px-md py-lg max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl font-bold">B</span>
            </div>
            <h1 className="text-h2 font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Batten Journal
            </h1>
          </div>
          <Link
            href="/login"
            className="text-body text-purple-600 hover:text-purple-700 hover:underline font-medium"
          >
            Log in
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-md py-xl">
        <div className="text-center mb-xl">
          <h2 className="text-h1 font-bold text-text-primary mb-md max-w-4xl mx-auto">
            A caring companion for families navigating{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Batten disease
            </span>
          </h2>
          <p className="text-title-lg text-text-secondary mb-lg max-w-2xl mx-auto">
            Track symptoms, share with your care team, and find patterns—all in one compassionate space designed for the Batten community.
          </p>
          <div className="flex flex-col items-center gap-sm">
            <Link
              href="/register"
              className="px-xl py-md bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-xl transition-all text-title-md font-semibold"
            >
              Get started — it's free
            </Link>
            <p className="text-meta text-text-secondary">
              Already have an account?{' '}
              <Link href="/login" className="text-purple-600 hover:text-purple-700 hover:underline font-medium">
                Log in
              </Link>
            </p>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-lg mb-xl">
          {/* Feature 1 */}
          <div className="p-lg bg-white rounded-lg border border-divider hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-md">
              <span className="text-2xl">📝</span>
            </div>
            <h3 className="text-title-md font-semibold text-text-primary mb-xs">
              Quick symptom logging
            </h3>
            <p className="text-body text-text-secondary">
              Designed for stressed moments. Log observations in seconds with smart severity tracking and context markers.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-lg bg-white rounded-lg border border-divider hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-md">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-title-md font-semibold text-text-primary mb-xs">
              Pattern recognition
            </h3>
            <p className="text-body text-text-secondary">
              See trends over time. Filter by event type, severity, or date range to spot patterns and share with specialists.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-lg bg-white rounded-lg border border-divider hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-md">
              <span className="text-2xl">🤝</span>
            </div>
            <h3 className="text-title-md font-semibold text-text-primary mb-xs">
              Share with care team
            </h3>
            <p className="text-body text-text-secondary">
              Grant controlled access to clinicians, specialists, and family members. You decide what they see.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-lg bg-white rounded-lg border border-divider hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-md">
              <span className="text-2xl">🏥</span>
            </div>
            <h3 className="text-title-md font-semibold text-text-primary mb-xs">
              Emergency card
            </h3>
            <p className="text-body text-text-secondary">
              Critical medical information at a glance. Allergies, medications, and care notes ready when seconds count.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-lg bg-white rounded-lg border border-divider hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-md">
              <span className="text-2xl">📅</span>
            </div>
            <h3 className="text-title-md font-semibold text-text-primary mb-xs">
              Appointments & reminders
            </h3>
            <p className="text-body text-text-secondary">
              Track upcoming appointments, sync to your calendar, and get gentle medication reminders—no guilt, just support.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-lg bg-white rounded-lg border border-divider hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-md">
              <span className="text-2xl">🔒</span>
            </div>
            <h3 className="text-title-md font-semibold text-text-primary mb-xs">
              Private & secure
            </h3>
            <p className="text-body text-text-secondary">
              Your data stays yours. Industry-standard encryption, GDPR compliant, and you control every permission.
            </p>
          </div>
        </div>

        {/* Social Proof / Trust Section */}
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-lg mb-xl text-center">
          <p className="text-body text-text-secondary mb-xs">
            Built with families, for families
          </p>
          <p className="text-title-md font-medium text-text-primary">
            Designed in collaboration with the Batten disease community—parents, clinicians, and researchers working together.
          </p>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white rounded-lg p-xl border border-divider">
          <h3 className="text-h2 font-bold text-text-primary mb-md">
            Ready to start?
          </h3>
          <p className="text-body text-text-secondary mb-lg max-w-xl mx-auto">
            Join other families using Batten Journal to track care, find patterns, and communicate with their medical team.
          </p>
          <Link
            href="/register"
            className="inline-block px-xl py-md bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-md hover:shadow-lg transition-all text-body font-medium"
          >
            Create your free account
          </Link>
          <p className="text-meta text-text-secondary mt-md">
            No credit card required • Free forever
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-md py-lg border-t border-divider mt-xl">
        <div className="text-center text-meta text-text-secondary">
          <p className="mb-xs">
            Batten Journal • Supporting families through every step
          </p>
          <p>
            Made with care for the Batten disease community
          </p>
        </div>
      </footer>
    </div>
  )
}
