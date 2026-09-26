import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["**/*.tsx"],
    ...reactHooks.configs.flat["recommended-latest"],
  },
  {
    // Registry items are copied into other people's projects, so accessibility
    // problems here become their problems. Hold them to the stricter bar.
    files: ["registry/**/*.tsx"],
    ...jsxA11y.flatConfigs.strict,
  },
  {
    // CLI scripts report through stdout on purpose.
    files: ["scripts/**/*.ts"],
    rules: { "no-console": "off" },
  },
  prettier
);
