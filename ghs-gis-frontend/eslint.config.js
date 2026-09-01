import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Type-aware linting, because the rules worth having here need types: the
 * `void`-prefixed fetches in MapView and useLayerCatalog are deliberate, and
 * only a type-checked `no-floating-promises` can tell them from the accidental
 * kind. `tsc --noEmit` still runs separately — this catches what types alone
 * don't.
 */
export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "public/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: reactHooks.configs.flat["recommended-latest"].plugins,
    rules: {
      ...reactHooks.configs.flat["recommended-latest"].rules,
      // Unused args are allowed when prefixed `_`, matching the tsconfig's
      // noUnusedParameters exemption so the two tools agree.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Config files are Node, not browser, and sit outside the tsconfig project.
    files: ["*.config.{js,ts}"],
    languageOptions: { globals: { ...globals.node } },
    ...tseslint.configs.disableTypeChecked,
  },
);
