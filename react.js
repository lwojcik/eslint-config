import eslintReact from '@eslint-react/eslint-plugin';
import { defineConfig } from 'eslint/config';
import jsxA11y from 'eslint-plugin-jsx-a11y-x';

const REACT_FILES = ['**/*.tsx'];

const warningsToErrors = (rules) =>
  Object.fromEntries(
    Object.entries(rules).map(([name, level]) => [
      name,
      level === 'warn' ? 'error' : level,
    ]),
  );

const { rules, ...strictTypeChecked } =
  eslintReact.configs['strict-type-checked'];

export const createReactConfig = ({ tsconfigRootDir, overrides = [] }) =>
  defineConfig(
    {
      ...strictTypeChecked,
      files: REACT_FILES,
      languageOptions: {
        ...strictTypeChecked.languageOptions,
        parserOptions: {
          ...strictTypeChecked.languageOptions.parserOptions,
          projectService: true,
          tsconfigRootDir,
        },
      },
      rules: warningsToErrors(rules),
    },
    { ...jsxA11y.configs.strict, files: REACT_FILES },
    ...overrides,
  );
