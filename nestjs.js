import nestjsTyped from '@darraghor/eslint-plugin-nestjs-typed';
import { defineConfig } from 'eslint/config';

const NEST_FILES = ['**/*.ts'];
const INJECTED_CLASS_FILES = [
  '**/*.{consumer,controller,filter,gateway,guard,handler,interceptor}.ts',
  '**/*.{middleware,pipe,processor,provider,repository,resolver,service,strategy}.ts',
];
const MAX_INJECTED_DEPENDENCIES = 5;

const SKIPPED_PATHS = ['node_modules', '\\.test\\.', '\\.spec\\.'];
const PROVIDED_RULE = '@darraghor/nestjs-typed/injectable-should-be-provided';

const [{ plugins }, { rules }] = nestjsTyped.configs.flatRecommended;
const [{ rules: swaggerRules }] = nestjsTyped.configs.flatNoSwagger;
const [, providedDefaults] = rules[PROVIDED_RULE];

export const createNestjsConfig = ({
  swagger = false,
  sourceGlobs = providedDefaults.src,
  overrides = [],
} = {}) =>
  defineConfig(
    {
      files: NEST_FILES,
      plugins,
      rules: {
        ...rules,
        ...(swagger ? {} : swaggerRules),
        [PROVIDED_RULE]: [
          'error',
          { filterFromPaths: SKIPPED_PATHS, src: sourceGlobs },
        ],
      },
    },
    {
      files: INJECTED_CLASS_FILES,
      rules: { 'max-params': ['error', MAX_INJECTED_DEPENDENCIES] },
    },
    ...overrides,
  );
