import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    // Force light mode explicitly
    darkMode: 'class', // We will never add the 'dark' class
    theme: {
        extend: {
            colors: {
                primary: '#5a0000',
                'primary-dark': '#3c0000',
                'primary-light': '#fef2f2',
                background: '#faf8f5',
                card: '#ffffff',
                text: {
                    primary: '#1a1a1a',
                    secondary: '#4b5563',
                    muted: '#6b7280',
                },
                border: '#d1d5db',
            },
            fontFamily: {
                display: ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
export default config;
