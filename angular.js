import angular from 'angular-eslint';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

const TS_FILES = ['**/*.ts'];
const TEMPLATE_FILES = ['**/*.html'];
const PREFIX = '@angular-eslint';
const TEMPLATE_PREFIX = '@angular-eslint/template';

const asErrors = (names, prefix) =>
  Object.fromEntries(names.map((name) => [`${prefix}/${name}`, 'error']));

const warningsToErrors = (rules) =>
  Object.fromEntries(
    Object.entries(rules).map(([name, level]) => [
      name,
      level === 'warn' ? 'error' : level,
    ]),
  );

const TS_RULES = asErrors(
  [
    'computed-must-return',
    'inject-at-top',
    'no-async-lifecycle-method',
    'no-attribute-decorator',
    'no-duplicates-in-metadata-arrays',
    'no-forward-ref',
    'no-global-document',
    'no-implicit-take-until-destroyed',
    'no-lifecycle-call',
    'no-pipe-impure',
    'no-queries-metadata-property',
    'no-uncalled-signals',
    'prefer-host-metadata-property',
    'prefer-output-emitter-ref',
    'prefer-output-readonly',
    'prefer-signal-model',
    'prefer-signals',
    'reactive-context-must-read-signal',
  ],
  PREFIX,
);

const TEMPLATE_RULES = asErrors(
  [
    'button-has-type',
    'no-any',
    'no-duplicate-attributes',
    'no-empty-control-flow',
    'no-inline-styles',
    'no-interpolation-in-attributes',
    'no-non-null-assertion',
    'no-positive-tabindex',
    'prefer-class-binding',
    'prefer-contextual-for-variables',
    'prefer-self-closing-tags',
    'prefer-style-binding',
    'require-switch-default',
  ],
  TEMPLATE_PREFIX,
);

const selectorRules = (prefix) => ({
  [`${PREFIX}/component-selector`]: [
    'error',
    { type: 'element', prefix, style: 'kebab-case' },
  ],
  [`${PREFIX}/directive-selector`]: [
    'error',
    { type: 'attribute', prefix, style: 'camelCase' },
  ],
  [`${PREFIX}/pipe-prefix`]: ['error', { prefixes: [prefix] }],
});

const recommendedRules = (configs) =>
  warningsToErrors(Object.assign({}, ...configs.map(({ rules }) => rules)));

export const createAngularConfig = ({ selectorPrefix, overrides = [] } = {}) =>
  defineConfig(
    {
      files: TS_FILES,
      processor: angular.processInlineTemplates,
      extends: angular.configs.tsRecommended,
      rules: {
        ...recommendedRules(angular.configs.tsRecommended),
        ...TS_RULES,
        ...(selectorPrefix ? selectorRules(selectorPrefix) : {}),
      },
    },
    {
      files: TEMPLATE_FILES,
      extends: [
        tseslint.configs.disableTypeChecked,
        ...angular.configs.templateRecommended,
        ...angular.configs.templateAccessibility,
      ],
      rules: {
        ...recommendedRules([
          ...angular.configs.templateRecommended,
          ...angular.configs.templateAccessibility,
        ]),
        ...TEMPLATE_RULES,
      },
    },
    ...overrides,
  );
