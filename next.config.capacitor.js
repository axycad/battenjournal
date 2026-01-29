const withNextIntl = require('next-intl/plugin')('./src/i18n.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Enable static HTML export
  trailingSlash: true,
  images: {
    unoptimized: true, // Required for static export
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://batten-journal.vercel.app',
    NEXT_PUBLIC_APP_ENV: 'capacitor',
  },
  // Skip ESLint and TypeScript checks during build (checked separately)
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable features that require server
  experimental: {},
}

module.exports = withNextIntl(nextConfig)
