import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* base is "/" for root deployments (Netlify, Vercel, a VPS, the FC bundle).
   A GitHub Pages project site lives under /<repo>/, so `npm run publish:pages`
   sets VITE_BASE_SEG=crisfu-capstone and every asset URL plus the router
   basename follow it. Deep links keep working because that build also ships a
   404.html copy of index.html, which is the SPA fallback GitHub Pages honours.

   The value is deliberately a bare segment without a leading slash: Git Bash on
   Windows rewrites POSIX-looking values such as /crisfu-capstone/ into a full
   C:\... path before Vite ever sees them. */
const seg = (process.env.VITE_BASE_SEG || "").replace(/^\/+|\/+$/g, "");
const base = seg ? `/${seg}/` : "/";

export default defineConfig({
  plugins: [react()],
  base,
  server: { port: 5173, open: false },
  build: { outDir: "dist", sourcemap: false },
});
