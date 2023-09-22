import legacy from "@vitejs/plugin-legacy";
import react from "@vitejs/plugin-react";
import {defineConfig} from "vite";
import UnoCSS from "unocss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [UnoCSS(), react(), legacy()],
  // build: {
  //   rollupOptions: {
  //     external: ["virtual:uno.css", "video.js", "@brightcove/loscore"],
  //   },
  // },
  // test: {
  //   globals: true,
  //   environment: "jsdom",
  //   setupFiles: "./src/setupTests.ts",
  // },
});
