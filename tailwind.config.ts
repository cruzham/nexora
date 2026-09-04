import type { Config } from "tailwindcss";

// NEXORA design tokens.
// Signature idea: the product's job is turning fuzzy intent into structured,
// measurable outcomes -- so the visual system leans on a "signal vs. noise"
// palette: a near-black "unstructured" ground, a cold structural blue-grey
// for the graph/strategy chrome, and a single warm signal color reserved
// ONLY for the thing the AI is confident about / recommending. Everything
// else stays deliberately quiet so the signal color keeps its meaning.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#0B0D10",       // page background -- "unstructured intent"
        graphite: "#14171C",   // panel background
        steel: "#232833",      // borders, dividers
        mist: "#8A93A3",       // secondary text
        signal: "#4FD1C5",     // teal -- confidence / recommended / done
        amber: "#E8A33D",      // caution -- assumption / needs review
        rose: "#E2617B",       // risk / blocker
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        node: "6px",
      },
    },
  },
  plugins: [],
};

export default config;
