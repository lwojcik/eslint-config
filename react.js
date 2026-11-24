import eslintReact from '@eslint-react/eslint-plugin';
import { defineConfig } from 'eslint/config';
import jsxA11y from 'eslint-plugin-jsx-a11y-x';

const REACT_FILES = ['**/*.tsx'];
const REACT_SOURCE_FILES = ['**/src/**/*.tsx'];
const MAX_COMPONENT_LINES = 100;
const REACT_NAME_REPLACEMENTS = {
  dir: { direction: false },
  props: false,
  ref: false,
};

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
    {
      files: REACT_SOURCE_FILES,
      rules: {
        'unicorn/name-replacements': [
          'error',
          { replacements: REACT_NAME_REPLACEMENTS },
        ],
        'max-lines-per-function': [
          'error',
          {
            max: MAX_COMPONENT_LINES,
            skipBlankLines: true,
            skipComments: true,
          },
        ],
      },
    },
    ...overrides,
  );
