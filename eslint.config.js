import { createConfig } from './index.js';

export default createConfig({
  tsconfigRootDir: import.meta.dirname,
  ignores: ['coverage/', 'test/fixtures/'],
  overrides: [
    {
      files: ['**/*.d.ts'],
      rules: { 'no-comments/disallowComments': 'off', 'max-len': 'off' },
    },
  ],
});
