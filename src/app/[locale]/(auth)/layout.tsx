import { Link } from '@/navigation'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      {/* Header */}
      <header className="px-md py-md border-b border-divider/50 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="flex items-center gap-sm hover:opacity-80 transition-opacity w-fit">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl font-bold">B</span>
            </div>
            <h1 className="text-h3 font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Batten Journal
            </h1>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-col items-center justify-center p-md py-xl">
        <div className="w-full max-w-md bg-white rounded-lg border border-divider shadow-lg p-xl">
          {children}
        </div>

        {/* Footer text */}
        <p className="mt-lg text-meta text-text-secondary text-center">
          Supporting families through every step
        </p>
      </main>
    </div>
  )
}
