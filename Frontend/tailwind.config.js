/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Manrope', 'system-ui', 'sans-serif'],
            },
            colors: {
                background: '#f8fafc',
                surface: {
                    DEFAULT: '#ffffff',
                    soft: '#f1f5f9',
                    border: '#e2e8f0',
                },
                primary: {
                    DEFAULT: '#2563eb', // Blue-600
                    glow: 'rgba(37, 99, 235, 0.2)',
                },
                secondary: {
                    DEFAULT: '#0891b2', // Cyan-600
                },
                accent: {
                    amber: '#d97706', // Amber-600
                    danger: '#ef4444', // Red-500
                },
                text: {
                    DEFAULT: '#1e293b', // Slate-800
                    muted: '#64748b', // Slate-500
                }
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'mic-pulse': 'mic-pulse 1.5s ease-in-out infinite',
            },
            keyframes: {
                'mic-pulse': {
                    '0%, 100%': { boxShadow: '0 0 0 10px rgba(248, 113, 113, 0.1)' },
                    '50%': { boxShadow: '0 0 0 20px rgba(248, 113, 113, 0.2)' },
                }
            }
        },
    },
    plugins: [],
}
