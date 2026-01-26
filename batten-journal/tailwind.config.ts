import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Design tokens from Batten-Journal UI System
      colors: {
        // Base colors
        bg: {
          primary: '#F8F9F7',    // Warm off-white, app background
        },
        text: {
          primary: '#1E1F21',    // Near-black charcoal
          secondary: '#6B7280',  // Muted slate gray
        },
        divider: '#E3E5E8',      // Section dividers
        
        // Accent (single accent only)
        accent: {
          primary: '#5F7486',    // Primary buttons, links
          focus: '#8FA3B3',      // Focus outlines
        },
        
        // Semantic colors (restricted use)
        semantic: {
          critical: '#9B3A3A',   // Allergies, critical labels
          warning: '#C08A2E',    // Caution states
          success: '#5E7D6A',    // "Saved" text only
        },
      },
      
      // Typography scale
      fontSize: {
        'title-lg': ['24px', { lineHeight: '32px' }],  // Screen titles
        'title-md': ['20px', { lineHeight: '28px' }],  // Section headers
        'body': ['17px', { lineHeight: '26px' }],      // Main content
        'meta': ['13px', { lineHeight: '18px' }],      // Timestamps, labels
        'caption': ['12px', { lineHeight: '16px' }],   // Helper text
      },
      
      // Spacing system (base unit: 8)
      spacing: {
        'xs': '8px',
        'sm': '16px',
        'md': '24px',
        'lg': '32px',
        'xl': '40px',
      },
      
      // Border radius
      borderRadius: {
        'sm': '6px',   // Inputs
        'md': '10px',  // Buttons
      },
      
      // Button height
      height: {
        'button': '48px',
      },
      
      // Motion (minimal)
      transitionDuration: {
        'fast': '120ms',
      },
      
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}

export default config
