import react from "@vitejs/plugin-react";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [UnoCSS(), react()],
	server: {
		port: 3003,
	},
	build: {
		sourcemap: 'inline',
	},
	// test: {
	//   globals: true,
	//   environment: "jsdom",
	//   setupFiles: "./src/setupTests.ts",
	// },
});
