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
