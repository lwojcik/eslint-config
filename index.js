import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import { defineConfig } from 'eslint/config';
import functional from 'eslint-plugin-functional';
import json from 'eslint-plugin-json';
import nodePlugin from 'eslint-plugin-n';
import noComments from 'eslint-plugin-no-comments';
import noPii from 'eslint-plugin-no-pii';
import noSecrets from 'eslint-plugin-no-secrets';
import noUnsanitized from 'eslint-plugin-no-unsanitized';
import optimizeRegex from 'eslint-plugin-optimize-regex';
import security from 'eslint-plugin-security';
import securityNode from 'eslint-plugin-security-node';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import { configs as sonarjs } from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

import xss from './xss-plugin.js';

const SOURCE_FILES = ['**/src/**/*.{ts,tsx}'];
const LOOP_SELECTORS = [
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
];
const TEST_FILES = ['**/test/**/*.{ts,tsx}', '**/*.{spec,test}.{ts,tsx}'];
const DRAFT_PATTERNS = ['draft.**', 'draft*.**', '**.draft.**', '**.draft*.**'];

const packagePattern = (aliases) =>
  aliases.length > 0 ? `^(?!${aliases.join('|')})@?\\w` : '^@?\\w';

const importGroups = (aliases) => [
  ['^\\u0000'],
  ['^node:'],
  [packagePattern(aliases)],
  ...aliases.map((alias) => [`^${alias}/`]),
  ['^\\.'],
];

const processEnvRules = ({ message, allowedIn }) => [
  {
    files: SOURCE_FILES,
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'process', property: 'env', message },
      ],
    },
  },
  { files: allowedIn, rules: { 'no-restricted-properties': 'off' } },
];

export const createConfig = ({
  tsconfigRootDir,
  importAliases = [],
  ignores = [],
  untypedFiles = [],
  nodeVersion = '>=24.0.0',
  processEnv,
  overrides = [],
}) =>
  defineConfig(
    {
      ignores: ['**/coverage/', '**/dist/', ...ignores],
    },
    eslint.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    {
      files: ['**/*.js', ...untypedFiles],
      extends: [tseslint.configs.disableTypeChecked],
    },
    {
      linterOptions: { reportUnusedDisableDirectives: 'error' },
      plugins: {
        '@stylistic': stylistic,
        'simple-import-sort': simpleImportSort,
      },
      rules: {
        'simple-import-sort/imports': [
          'error',
          { groups: importGroups(importAliases) },
        ],
        'simple-import-sort/exports': 'error',
        'no-var': 'error',
        'prefer-const': 'error',
        'object-shorthand': ['error', 'always'],
        'no-useless-rename': 'error',
        'no-param-reassign': ['error', { props: false }],
        eqeqeq: ['error', 'always'],
        'max-len': [
          'error',
          {
            code: 80,
            ignoreUrls: true,
            ignoreStrings: true,
            ignoreTemplateLiterals: true,
            ignoreRegExpLiterals: true,
            ignorePattern: '^\\s*(//|/\\*) eslint-',
          },
        ],
        'no-restricted-syntax': [
          'error',
          ...LOOP_SELECTORS.map((selector) => ({
            selector,
            message:
              'Use map, filter, flatMap, find, some or reduce. A loop that must run in order may stay, with a disable comment that says why.',
          })),
          {
            selector: "VariableDeclaration[kind='let']",
            message:
              'Use const: a value built with map, filter, reduce, find or a ternary. A let that must stay (assigned in a try, kept across an await) may have a disable comment that says why.',
          },
        ],
        '@stylistic/padding-line-between-statements': [
          'error',
          { blankLine: 'always', prev: '*', next: 'return' },
          { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
          {
            blankLine: 'any',
            prev: ['const', 'let', 'var'],
            next: ['const', 'let', 'var'],
          },
          { blankLine: 'always', prev: '*', next: 'multiline-block-like' },
          { blankLine: 'always', prev: 'multiline-block-like', next: '*' },
        ],
        '@typescript-eslint/no-unused-vars': [
          'error',
          { ignoreRestSiblings: true },
        ],
      },
    },
    {
      files: ['**/*.{ts,tsx}'],
      ignores: untypedFiles,
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir },
      },
      rules: {
        '@typescript-eslint/prefer-includes': 'error',
        '@typescript-eslint/prefer-find': 'error',
        '@typescript-eslint/dot-notation': 'error',
      },
    },
    {
      files: SOURCE_FILES,
      plugins: { functional },
      rules: {
        'functional/immutable-data': [
          'error',
          {
            ignoreClasses: true,
            ignoreNonConstDeclarations: { treatParametersAsConst: false },
            ignoreAccessorPattern: DRAFT_PATTERNS,
          },
        ],
        'no-console': 'error',
        'max-classes-per-file': ['error', 1],
        'max-depth': ['error', 4],
        'no-magic-numbers': [
          'error',
          {
            detectObjects: false,
            enforceConst: true,
            ignore: [0, 1, -1, 2],
            ignoreArrayIndexes: true,
          },
        ],
        'id-length': ['error', { min: 2, exceptions: ['_'] }],
        complexity: ['error', 10],
        'max-params': ['error', 2],
        'max-statements': ['error', 20],
        'max-lines-per-function': [
          'error',
          { max: 50, skipBlankLines: true, skipComments: true },
        ],
        'max-lines': [
          'error',
          { max: 250, skipBlankLines: true, skipComments: true },
        ],
      },
    },
    ...(processEnv ? processEnvRules(processEnv) : []),
    {
      ...unicorn.configs.recommended,
      files: SOURCE_FILES,
    },
    { ...sonarjs.recommended, files: SOURCE_FILES },
    { ...noPii.configs.recommended, files: SOURCE_FILES },
    { ...security.configs.recommended, files: SOURCE_FILES },
    {
      files: SOURCE_FILES,
      rules: { 'security/detect-object-injection': 'off' },
    },
    {
      files: SOURCE_FILES,
      plugins: {
        'no-secrets': noSecrets,
        'security-node': securityNode,
        xss,
        'optimize-regex': optimizeRegex,
        'no-unsanitized': noUnsanitized,
      },
      rules: {
        ...securityNode.configs.recommended.rules,
        ...noUnsanitized.configs.recommended.rules,
        'security-node/non-literal-reg-expr': 'off',
        'security-node/detect-insecure-randomness': 'off',
        'security-node/detect-non-literal-require-calls': 'off',
        'no-secrets/no-secrets': ['error', { tolerance: 4.7 }],
        'xss/no-location-href-assign': 'error',
        'optimize-regex/optimize-regex': 'error',
      },
    },
    {
      ...nodePlugin.configs['flat/recommended-module'],
      files: SOURCE_FILES,
      settings: { n: { version: nodeVersion } },
    },
    {
      files: SOURCE_FILES,
      rules: { 'n/no-missing-import': 'off' },
    },
    {
      files: ['**/*.json'],
      ignores: ['**/package-lock.json'],
      extends: [tseslint.configs.disableTypeChecked],
      ...json.configs['recommended-with-comments'],
    },
    {
      files: ['**/src/config.ts'],
      rules: { 'no-magic-numbers': 'off' },
    },
    {
      files: SOURCE_FILES,
      rules: {
        'unicorn/filename-case': [
          'error',
          { cases: { kebabCase: true, pascalCase: true } },
        ],
        'unicorn/name-replacements': [
          'error',
          { replacements: { dir: { direction: false } } },
        ],
        'sonarjs/new-operator-misuse': 'off',
        'unicorn/no-null': 'off',
        'unicorn/text-encoding-identifier-case': 'off',
        'unicorn/no-for-each': 'off',
        'unicorn/class-reference-in-static-methods': 'off',
        'unicorn/consistent-class-member-order': 'off',
        'unicorn/explicit-length-check': 'off',
        'unicorn/no-negated-condition': 'off',
        'unicorn/prefer-ternary': 'off',
        'unicorn/prefer-early-return': 'off',
        'unicorn/max-nested-calls': 'off',
        'unicorn/prefer-simple-condition-first': 'off',
        'unicorn/no-array-callback-reference': 'off',
      },
    },
    {
      files: ['**/*.{ts,tsx,js}'],
      plugins: { 'no-comments': noComments },
      rules: { 'no-comments/disallowComments': 'error' },
    },
    {
      files: [...TEST_FILES, '**/scripts/**/*.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
      },
    },
    {
      files: TEST_FILES,
      rules: {
        '@typescript-eslint/require-await': 'off',
        '@typescript-eslint/only-throw-error': 'off',
        '@typescript-eslint/prefer-promise-reject-errors': 'off',
      },
    },
    {
      files: ['**/*.{spec,test}.{ts,tsx}'],
      rules: {
        'no-magic-numbers': 'off',
        'max-lines': 'off',
        'max-lines-per-function': 'off',
        'max-statements': 'off',
      },
    },
    ...overrides,
  );
