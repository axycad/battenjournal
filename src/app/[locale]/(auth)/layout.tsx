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
            <div className="relative w-10 h-10">
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <defs>
                  <linearGradient id="logoGradientAuth" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#9333ea" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
                <rect width="32" height="32" rx="6" fill="url(#logoGradientAuth)" />
                <path
                  d="M10 7h8.6c3.5 0 5.9 2 5.9 5.1 0 2.2-1.2 3.8-3.1 4.5 2.5.6 4.1 2.5 4.1 5.2 0 3.6-2.8 5.8-6.8 5.8H10V7z"
                  fill="white"
                  opacity="0.95"
                />
                <rect x="14" y="10" width="6.6" height="3.8" rx="1.9" fill="url(#logoGradientAuth)" />
                <rect x="14" y="18" width="7.4" height="4.4" rx="2.2" fill="url(#logoGradientAuth)" />
              </svg>
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
