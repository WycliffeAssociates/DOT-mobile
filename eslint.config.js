import eslintReact from "eslint-plugin-react";
import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  js.configs.recommended,

  eslintReact.configs.recommended,
  // tseslint.configs.recommended,
  {
    files: ["src/**/*.{jsx,tsx,js,ts}"],
    ignores: ["node_modules/*"],

    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    plugins: {
      react: eslintReact,
    },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      //   parser: {
      //     tsParser,
      //   },
      //   parserOptions: {
      //     ecmaVersion: "latest",
      // sourceType: "module",
      //   }
    },
    rules: {
      "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
      "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
    },
  },
];
