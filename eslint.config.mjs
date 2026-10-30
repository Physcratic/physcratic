import tsParser from "@typescript-eslint/parser";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  { ignores: [".next/**", "out/**", "build/**", "node_modules/**", "next-env.d.ts", "public/**"] },
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: { parser: tsParser, ecmaVersion: "latest", sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "no-debugger": "error",
      "no-duplicate-case": "error",
      "no-unreachable": "error",
      "valid-typeof": "error",
    },
  },
];
