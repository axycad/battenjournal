import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.battenjournal.app',
  appName: 'Batten Journal',
  webDir: 'out', // Next.js static export directory
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'BattenJournal',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#FFF8F2',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#FFF8F2',
      showSpinner: false,
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#9333EA', // purple-600
    },
  },
}

export default config
