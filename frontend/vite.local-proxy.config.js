// Local preview only (not used by Netlify builds).
// Run: VITE_API_BASE_URL=/sjapi npx vite --config vite.local-proxy.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/sjapi": {
        target: "https://api.sportsjedi.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sjapi/, ""),
        headers: { origin: "https://sportsjedi.com" },
      },
    },
  },
});
