import { defineConfig } from "vite";

export default defineConfig({
  appType: "spa",
  preview: {
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
