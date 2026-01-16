import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#0f172a",
        steel: "#1f2937",
        mint: "#7dd3fc",
        amber: "#fbbf24",
        cloud: "#e2e8f0"
      },
      fontFamily: {
        grotesk: ["Space Grotesk", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"]
      },
      boxShadow: {
        glass: "0 20px 80px rgba(0,0,0,0.25)"
      }
    }
  },
  plugins: []
};

export default config;
