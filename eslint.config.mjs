import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
  // Resolve Next's declared plugins from its package under pnpm's isolated layout.
  resolvePluginsRelativeTo: dirname(fileURLToPath(import.meta.resolve("eslint-config-next"))),
});
const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "work/**", "out/**", "build/**"] },
  ...compat.extends("next/core-web-vitals"),
  // ImageResponse entrypoints render images directly; they cannot use next/image.
  { files: ["app/**/opengraph-image.tsx"], rules: { "@next/next/no-img-element": "off" } },
];
export default config;
