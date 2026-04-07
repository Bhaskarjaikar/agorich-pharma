import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    // Project-wide rule adjustments
    rules: {
      // Treat explicit any as a warning instead of an error to avoid build blocking,
      // while still surfacing places that need stronger typing over time.
      "@typescript-eslint/no-explicit-any": "warn",

      // Allow Node-style require imports (used in verify-supabase-setup.js and similar scripts).
      "@typescript-eslint/no-require-imports": "off",

      // Allow unescaped quotes/apostrophes in JSX text content to keep copy natural.
      "react/no-unescaped-entities": "off",
    },
  },
];

export default eslintConfig;
