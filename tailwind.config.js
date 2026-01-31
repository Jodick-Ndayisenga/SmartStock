// tailwind.config.ts

/** @type {import('tailwindcss').Config} */


// tailwind.config.js
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 🌞 Light Mode Colors - Stock Management App
        surface: '#ffffff',
        'surface-soft': '#f8fafc',
        'surface-muted': '#f1f5f9',
        
        text: '#0f172a',
        'text-soft': '#475569',
        'text-muted': '#64748b',
        
        brand: '#0ea5e9',      // Primary brand - Lake Blue
        'brand-soft': '#e0f2fe',
        
        success: '#22c55e',    // In stock - Green Hills
        'success-soft': '#dcfce7',
        
        warning: '#f59e0b',    // Low stock - Sunset Gold
        'warning-soft': '#fef3c7',
        
        error: '#ef4444',      // Out of stock - Alert Red
        'error-soft': '#fee2e2',
        
        accent: '#dc2626',     // Secondary accent - Earth Red
        'accent-soft': '#fecaca',
        
        border: '#e2e8f0',
        'border-strong': '#cbd5e1',
        
        overlay: '#00000066',  // For modals, sheets
        
        // Semantic variants
        'stock-in': '#22c55e',
        'stock-low': '#f59e0b',
        'stock-out': '#ef4444',
        'price-up': '#22c55e',
        'price-down': '#ef4444',

        // 🌙 Dark Mode Colors
        dark: {
          surface: '#0f172a',
          'surface-soft': '#1e293b',
          'surface-muted': '#334155',
          
          text: '#f1f5f9',
          'text-soft': '#cbd5e1',
          'text-muted': '#94a3b8',
          
          brand: '#38bdf8',
          'brand-soft': '#1e3a5c',
          
          success: '#4ade80',
          'success-soft': '#1a4532',
          
          warning: '#fbbf24',
          'warning-soft': '#453209',
          
          error: '#f87171',
          'error-soft': '#4c1d1d',
          
          accent: '#f87171',
          'accent-soft': '#4c1d1d',
          
          border: '#475569',
          'border-strong': '#64748b',
          
          overlay: '#00000099',
          
          // Semantic variants
          'stock-in': '#4ade80',
          'stock-low': '#fbbf24',
          'stock-out': '#f87171',
          'price-up': '#4ade80',
          'price-down': '#f87171',
        }
      },
      borderRadius: {
        none: '0px',
        xs: '4px',
        sm: '8px',
        base: '12px',
        md: '16px',
        lg: '20px',
        xl: '24px',
        full: '9999px',
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
      fontSize: {
        'xs': ['12px', { lineHeight: '16px' }],
        'sm': ['14px', { lineHeight: '20px' }],
        'base': ['16px', { lineHeight: '24px' }],
        'lg': ['18px', { lineHeight: '28px' }],
        'xl': ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'elevated': '0 4px 16px rgba(0, 0, 0, 0.12)',
        'button': '0 2px 6px rgba(14, 165, 233, 0.2)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
      },
      fontFamily:{
        inter: {
          regular: 'Inter-Regular',
          medium: 'Inter-Medium',
          semibold: 'Inter-SemiBold',
          bold: 'Inter-Bold',
        },
      }
    },
  },
  plugins: [],
};
