import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand
        primary: "#faff69",
        "primary-active": "#e6eb52",
        "primary-disabled": "#3a3a1f",
        // Text
        ink: "#ffffff",
        body: "#cccccc",
        "body-strong": "#e6e6e6",
        muted: "#888888",
        "muted-soft": "#5a5a5a",
        "on-primary": "#0a0a0a",
        "on-dark": "#ffffff",
        "on-yellow": "#0a0a0a",
        // Surface
        canvas: "#0a0a0a",
        "surface-soft": "#121212",
        "surface-card": "#1a1a1a",
        "surface-elevated": "#242424",
        "surface-yellow-band": "#faff69",
        // Border
        hairline: "#2a2a2a",
        "hairline-strong": "#3a3a3a",
        // Accent
        "accent-emerald": "#22c55e",
        "accent-rose": "#ef4444",
        "accent-blue": "#3b82f6",
        // Semantic
        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
      },
      fontFamily: {
        display: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        "display-xl": ["72px", { lineHeight: "1.05", letterSpacing: "-2.5px", fontWeight: "700" }],
        "display-lg": ["56px", { lineHeight: "1.1", letterSpacing: "-2px", fontWeight: "700" }],
        "display-md": ["40px", { lineHeight: "1.15", letterSpacing: "-1.5px", fontWeight: "700" }],
        "display-sm": ["32px", { lineHeight: "1.2", letterSpacing: "-1px", fontWeight: "700" }],
        "title-lg": ["24px", { lineHeight: "1.3", letterSpacing: "-0.3px", fontWeight: "700" }],
        "title-md": ["18px", { lineHeight: "1.4", letterSpacing: "0", fontWeight: "600" }],
        "title-sm": ["16px", { lineHeight: "1.4", letterSpacing: "0", fontWeight: "600" }],
        "stat-display": ["56px", { lineHeight: "1.0", letterSpacing: "-1.5px", fontWeight: "700" }],
        "body-md": ["16px", { lineHeight: "1.55", letterSpacing: "0", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "1.55", letterSpacing: "0", fontWeight: "400" }],
        caption: ["13px", { lineHeight: "1.4", letterSpacing: "0", fontWeight: "500" }],
        "caption-uppercase": ["12px", { lineHeight: "1.4", letterSpacing: "1.5px", fontWeight: "600" }],
        code: ["14px", { lineHeight: "1.55", letterSpacing: "0", fontWeight: "400" }],
        button: ["14px", { lineHeight: "1.0", letterSpacing: "0", fontWeight: "600" }],
        "nav-link": ["14px", { lineHeight: "1.4", letterSpacing: "0", fontWeight: "500" }],
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        pill: "9999px",
        full: "9999px",
      },
      spacing: {
        xxs: "4px",
        xs: "8px",
        sm: "12px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        xxl: "48px",
        section: "96px",
      },
    },
  },
  plugins: [animate],
};

export default config;
