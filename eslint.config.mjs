import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**"],
  },
  ...compat
    .extends("eslint:recommended", "plugin:prettier/recommended")
    .map((config) => ({
      ...config,
      files: ["**/*.{js,mjs,ts,tsx}"],
    })),
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
];
