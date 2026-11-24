import { defineConfig } from 'eslint/config';
import rxjs from 'eslint-plugin-rxjs-x';

export const createRxjsConfig = ({ untypedFiles = [], overrides = [] } = {}) =>
  defineConfig(
    { ...rxjs.configs.strict, files: ['**/*.ts'], ignores: untypedFiles },
    ...overrides,
  );
