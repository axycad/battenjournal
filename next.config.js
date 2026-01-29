const withNextIntl = require('next-intl/plugin')('./src/i18n.ts')

// Check if building for Capacitor
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true'

const withPWA = isCapacitorBuild
  ? (config) => config // No-op for Capacitor builds
  : require('next-pwa')({
      dest: 'public',
      register: true,
      skipWaiting: true,
      disable: process.env.NODE_ENV === 'development',
      buildExcludes: [/middleware-manifest\.json$/],
      runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /\.(?:js|css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources',
      },
    },
    {
      urlPattern: /^\/api\//,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
      },
    },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = isCapacitorBuild
  ? {
      // Capacitor-specific configuration
      // Static export for native mobile apps
      output: 'export',
      trailingSlash: true,
      images: {
        unoptimized: true,
      },
      env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://batten-journal.vercel.app',
        NEXT_PUBLIC_APP_ENV: 'capacitor',
      },
      eslint: {
        ignoreDuringBuilds: true,
      },
      typescript: {
        ignoreBuildErrors: true,
      },
      // Allow export to continue despite prerender errors
      // These pages will fetch data client-side in the native app
      experimental: {
        missingSuspenseWithCSRBailout: false,
        cpus: 1,
        workerThreads: false,
      },
      // Generate minimal static pages - actual content loads client-side
      generateBuildId: async () => {
        return 'capacitor-build'
      },
      // Disable static generation for dynamic routes - let them render client-side
      webpack: (config, { isServer }) => {
        if (!isServer) {
          config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
            net: false,
            tls: false,
          }
        }
        return config
      },
    }
  : {
      // Web configuration
      eslint: {
        ignoreDuringBuilds: true,
      },
      experimental: {
        serverActions: {
          bodySizeLimit: '10mb',
        },
      },
      images: {
        remotePatterns: [
          {
            protocol: 'https',
            hostname: '**.neon.tech',
          },
        ],
      },
    }

module.exports = withPWA(withNextIntl(nextConfig))
