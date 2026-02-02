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
                  d="M9 13.5C9 11.567 10.567 10 12.5 10h7c1.933 0 3.5 1.567 3.5 3.5v0c0 1.38-.8 2.64-2.05 3.22L19 17.5v2.5c0 1.105-.895 2-2 2h-2c-1.105 0-2-.895-2-2v-2.5l-1.95-.78C9.8 16.14 9 14.88 9 13.5z"
                  fill="white"
                  opacity="0.95"
                />
                <circle cx="13.5" cy="13.5" r="1.5" fill="url(#logoGradientAuth)" />
                <circle cx="18.5" cy="13.5" r="1.5" fill="url(#logoGradientAuth)" />
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
