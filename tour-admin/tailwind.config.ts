import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: {
          900: "#0e3832",
          800: "#103f39",
        },
        primary: "#5ea59b",
        secondary: "#92c7c7",
        success: "#5ea59b",
        warning: "#c8a84b",
        danger: "#c0544a",
        neutral: "#6b7b7a",
        surface: "#f5fafa",
        card: "#ffffff",
        border: "#d0e8e5",
        textLight: "#f0fafa",
        textDark: "#1a2e2c",
      },
      fontFamily: {
        heading: ["Folkies Vantage Sans Folkies", "Sora", "sans-serif"],
        body: ["Monoglyphic", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        soft: "0 4px 18px rgba(14, 56, 50, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
