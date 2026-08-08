import nextPlugin from "@next/eslint-plugin-next";

export default [
  {
    ignores: [".next/**", "dist/**", "node_modules/**", "out/**", "build/**"],
  },
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
];
