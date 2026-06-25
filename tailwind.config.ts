import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Friendly, trustworthy brand palette (clean & approachable).
        brand: {
          50: "#eef4ff",
          100: "#dae6ff",
          200: "#bdd2ff",
          300: "#90b4ff",
          400: "#5c8bff",
          500: "#3563ff",
          600: "#1d44f5",
          700: "#1633e1",
          800: "#182cb6",
          900: "#1a2c8f",
        },
        ink: {
          DEFAULT: "#1f2430",
          soft: "#3b4252",
          muted: "#6b7280",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.06), 0 4px 16px rgba(16,24,40,.08)",
        float: "0 8px 30px rgba(16,24,40,.18)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
