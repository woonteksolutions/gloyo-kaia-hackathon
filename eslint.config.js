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
      "@typescript-eslint/no-unused-vars": "off",
      "no-restricted-syntax": [
        "error",
        {
          selector: "Identifier[name='jwt']",
          message: "Use `accessToken` via src/auth/token.ts"
        },
        {
          selector: "Identifier[name=/^(token|authToken|sessionToken|bearerToken)$/]",
          message: "Use `accessToken` via src/auth/token.ts"
        },
        {
          selector: "Literal[value='gnosis_access_token']",
          message: "Use accessToken storage via src/auth/token.ts"
        },
        {
          selector: "Literal[value='access_token']",
          message: "Use `accessToken` via src/auth/token.ts"
        }
      ]
    },
  }
);
