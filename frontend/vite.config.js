import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    // This project uses plain CSS - do not search parent directories for a
    // PostCSS config (avoids picking up unrelated configs when the project
    // is nested inside another repository).
    postcss: {},
  },
});
