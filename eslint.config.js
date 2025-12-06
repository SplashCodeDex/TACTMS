import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
    { ignores: ["dist", "node_modules", ".vite", "coverage", "**/*.d.ts"] },
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        plugins: {
            react: react,
            "react-hooks": reactHooks,
        },
        rules: {
            ...react.configs.recommended.rules,
            ...reactHooks.configs.recommended.rules,
            "react/react-in-jsx-scope": "off",
            "react/prop-types": "off",
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
        },
        settings: {
            react: {
                version: "detect",
            },
        },
    }
);
