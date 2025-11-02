/** @type {import('tailwindcss').Config} */
import tailwindcssAnimate from "tailwindcss-animate"
import tailwindcssTypography from "@tailwindcss/typography"

const config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "oklch(0.9 0.015 240)",
        input: "oklch(0.9 0.015 240)",
        ring: "oklch(0.65 0.15 200)",
        background: "oklch(0.99 0.005 240)",
        foreground: "oklch(0.2 0.02 240)",
        primary: {
          DEFAULT: "oklch(0.68 0.2 235)",
          foreground: "oklch(0.99 0.005 240)",
        },
        secondary: {
          DEFAULT: "oklch(0.94 0.01 240)",
          foreground: "oklch(0.3 0.02 240)",
        },
        destructive: {
          DEFAULT: "oklch(0.5 0.2 40)",
          foreground: "oklch(0.98 0.01 90)",
        },
        muted: {
          DEFAULT: "oklch(0.94 0.01 240)",
          foreground: "oklch(0.45 0.02 240)",
        },
        accent: {
          DEFAULT: "oklch(0.85 0.08 90)",
          foreground: "oklch(0.35 0.06 90)",
        },
        popover: {
          DEFAULT: "oklch(0.97 0.008 240)",
          foreground: "oklch(0.2 0.02 240)",
        },
        card: {
          DEFAULT: "oklch(0.97 0.008 240)",
          foreground: "oklch(0.2 0.02 240)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.foreground'),
            '--tw-prose-headings': theme('colors.primary.DEFAULT'),
            '--tw-prose-lead': theme('colors.foreground'),
            '--tw-prose-links': theme('colors.primary.DEFAULT'),
            '--tw-prose-bold': theme('colors.foreground'),
            '--tw-prose-counters': theme('colors.muted.foreground'),
            '--tw-prose-bullets': theme('colors.muted.foreground'),
            '--tw-prose-hr': theme('colors.border'),
            '--tw-prose-quotes': theme('colors.foreground'),
            '--tw-prose-quote-borders': theme('colors.border'),
            '--tw-prose-captions': theme('colors.muted.foreground'),
            '--tw-prose-code': theme('colors.foreground'),
            '--tw-prose-pre-code': theme('colors.foreground'),
            '--tw-prose-pre-bg': theme('colors.muted.DEFAULT'),
            '--tw-prose-th-borders': theme('colors.border'),
            '--tw-prose-td-borders': theme('colors.border'),
            p: {
              fontSize: '1.125rem', // 本文の文字サイズを大きくする (text-lg相当)
              lineHeight: '1.8',   // 行間を広くする
            },
            'h1, h2, h3, h4, h5, h6': {
              marginTop: '1.5em',    // 見出しの上の余白を調整
              marginBottom: '0.5em', // 見出しの下の余白を調整
            },
          },
        },
      }),
    },
  },
  plugins: [tailwindcssAnimate, tailwindcssTypography],
}

export default config