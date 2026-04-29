import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api/novela": { target: "http://localhost:18001", rewrite: p => p.replace(/^\/api\/novela/, "") },
      "/api/pulse":  { target: "http://localhost:18002", rewrite: p => p.replace(/^\/api\/pulse/, "") },
    },
  },
});
