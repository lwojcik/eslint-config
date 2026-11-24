import tanstackQuery from '@tanstack/eslint-plugin-query';
import { defineConfig } from 'eslint/config';

const QUERY_FILES = ['**/*.{ts,tsx}'];

const warningsToErrors = (rules) =>
  Object.fromEntries(
    Object.entries(rules).map(([name, level]) => [
      name,
      level === 'warn' ? 'error' : level,
    ]),
  );

const { rules, ...recommendedStrict } =
  tanstackQuery.configs['flat/recommended-strict'][0];

export const createTanstackQueryConfig = ({ overrides = [] } = {}) =>
  defineConfig(
    {
      ...recommendedStrict,
      files: QUERY_FILES,
      rules: warningsToErrors(rules),
    },
    ...overrides,
  );
