import unjs from "eslint-config-unjs";

// https://github.com/unjs/eslint-config
export default unjs({
  ignores: [
    "docs/**",
    "docs/.nuxt/**",
    "docs",
    "test/fixtures/codebase-test/**",
  ],
  rules: {
    "unicorn/no-null": 0,
    "unicorn/prefer-top-level-await": 0,
    "unicorn/template-indent": 0,
    "unicorn/no-process-exit": 0,
  },
});
