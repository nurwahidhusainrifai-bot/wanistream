/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                dark: {
                    900: '#0B0E14',
                    800: '#151A25',
                    700: '#1E2532',
                    600: '#2D3748',
                    500: '#3D4A5C',
                },
                primary: {
                    400: '#818CF8',
                    500: '#6366F1',
                    600: '#4F46E5',
                },
                accent: {
                    500: '#8B5CF6',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
