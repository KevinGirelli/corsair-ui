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
    files: ["registry/default/**/*.tsx"],
    ...jsxA11y.flatConfigs.strict,
  },
  {
    // React Native items run in an app, where the DOM does not exist. Their
    // accessibility goes through accessibilityRole/State/Value, checked in tests.
    files: ["registry/native/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        ...[
          "document",
          "localStorage",
          "sessionStorage",
          "matchMedia",
          "getComputedStyle",
          "IntersectionObserver",
          "ResizeObserver",
          "HTMLElement",
        ].map((name) => ({ name, message: "Not available in React Native." })),
      ],
      // Expo apps also run on the web, through react-native-web, which lacks these.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-native",
              importNames: ["useAnimatedValue"],
              message:
                "Not in react-native-web: use `const [value] = useState(() => new Animated.Value(x))`.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["registry/native/*.js", "registry/native/**/*.test.{ts,tsx}"],
    languageOptions: { globals: { ...globals.jest } },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    // CLI scripts report through stdout on purpose.
    files: ["scripts/**/*.ts"],
    rules: { "no-console": "off" },
  },
  prettier
);
