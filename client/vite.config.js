import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 7002,
    proxy: {
      "/api": "http://localhost:7001",
      "/uploads": "http://localhost:7001",
      "/socket.io": {
        target: "http://localhost:7001",
        ws: true
      }
    }
  },
  preview: {
    port: 7003
  }
});
