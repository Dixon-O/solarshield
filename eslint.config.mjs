// @ts-check
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

/** @type {import("eslint").Linter.FlatConfig[]} */
const config = [
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "dist/**", "build/**"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      // TypeScript recommended rules
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      // Security rules
      "no-console": ["warn", { allow: ["error", "warn"] }],
      // No empty catch blocks (Standing Order §9.4)
      "no-empty": ["error", { allowEmptyCatch: false }],
    },
  },
];

export default config;
