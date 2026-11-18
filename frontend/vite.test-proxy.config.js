// Local testing only (not used by Netlify): talks to a TEST copy of the API through an SSH tunnel on :4199.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      "/sjapi": {
        target: "http://127.0.0.1:4199",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sjapi/, ""),
        headers: { origin: "https://sportsjedi.com" },
      },
    },
  },
});
