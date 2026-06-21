import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#090b12",
        panel: "#121722",
        "panel-warm": "#1b2233",
        border: "#2a3447",
        "border-soft": "#1d2636",
        accent: "#60a5fa",
        muted: "#94a3b8",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["SF Mono", "ui-monospace", "Menlo", "monospace"],
      },
      boxShadow: {
        glow: "0 0 28px rgba(96, 165, 250, 0.38)",
      },
    },
  },
  plugins: [],
};

export default config;
