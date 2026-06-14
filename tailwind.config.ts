import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        canvas: "#0a0a0a",
        primary: "#faff69",
        "primary-active": "#e6eb52",
        "primary-disabled": "#3a3a1f",
        ink: "#ffffff",
        body: "#cccccc",
        "body-strong": "#e6e6e6",
        muted: "#888888",
        "muted-soft": "#5a5a5a",
        hairline: "#2a2a2a",
        "hairline-strong": "#3a3a3a",
        "surface-card": "#1a1a1a",
        "surface-soft": "#121212",
        "surface-elevated": "#242424",
        "on-primary": "#0a0a0a",
        "on-yellow": "#0a0a0a",
        "accent-emerald": "#22c55e",
        "accent-rose": "#ef4444",
        "accent-blue": "#3b82f6",
      },
      boxShadow: {
        "neon-green": "0 0 30px rgba(34, 197, 94, 0.22)",
        "neon-cyan": "0 0 30px rgba(34, 211, 238, 0.22)",
        "neon-amber": "0 0 30px rgba(245, 158, 11, 0.24)",
      },
      fontFamily: {
        display: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular"],
      },
    },
  },
  plugins: [animate],
};

export default config;
