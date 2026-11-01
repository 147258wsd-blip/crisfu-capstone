import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "/" is required for deep links (/blog/:id must load /assets/*).
// The dist folder therefore needs a static server — `npm run preview`
// locally, or Vercel/Netlify in production.
export default defineConfig({
  plugins: [react()],
  base: "/",
  server: { port: 5173, open: false },
  build: { outDir: "dist", sourcemap: false },
});
