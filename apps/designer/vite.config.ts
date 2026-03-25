import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@contracts": fileURLToPath(
        new URL("../backend/src/contracts", import.meta.url),
      ),
    },
  },
  plugins: [
    tailwindcss(),

    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),

    react(),

    babel({ presets: [reactCompilerPreset()] }),
  ],
});
