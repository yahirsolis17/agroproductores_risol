import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // ============================================================
      // GUARDRAILS ANTI-BIFURCACIÓN (Canon del sistema)
      // ============================================================

      // Bloquear @ts-ignore, solo permitir @ts-expect-error con comentario
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": true,
          "ts-expect-error": "allow-with-description",
          "ts-nocheck": true,
          "minimumDescriptionLength": 10,
        },
      ],

      // Advertir sobre uso de 'any' (no bloquear para permitir migración gradual)
      "@typescript-eslint/no-explicit-any": "warn",

      // Requerir tipado en catch blocks
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  // ============================================================
  // Reglas más estrictas para capas CORE (global/store, global/api)
  // ============================================================
  {
    files: ["src/global/store/**/*.ts", "src/global/api/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error", // ERROR en core, no solo warn
    },
  },
  // ============================================================
  // Restricciones de imports (toast y axios)
  // ============================================================
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["src/global/utils/NotificationEngine.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react-toastify"],
              message: "Use handleBackendNotification from NotificationEngine instead of toast directly.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["src/global/api/apiClient.ts", "src/global/utils/backendEnvelope.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "axios",
              message: "Use apiClient from global/api/apiClient instead of axios directly.",
            },
          ],
        },
      ],
    },
  }
);
