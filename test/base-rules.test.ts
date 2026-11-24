import { describe, expect, it } from 'vitest';

import { lint } from './lint.js';

const SRC = 'src/example.ts';

const rulesFor = (code: string, file = SRC) => lint({ file, code });

const enable = (rule: string) => ({
  overrides: [{ files: ['**/*.ts'], rules: { [rule]: 'error' as const } }],
});

const statements = (count: number) =>
  Array.from(
    { length: count },
    (_, index) => `  const v${index} = ${index % 2};\n`,
  ).join('');

const lineList = (count: number) =>
  Array.from({ length: count }, (_, index) => `    ${index % 2},\n`).join('');

const longFunction = (items: number) =>
  `export const list = (): number[] => {\n  const values = [\n${lineList(items)}  ];\n\n  return values;\n};\n`;

const nested = (depth: number) => {
  const body = Array.from({ length: depth }).reduce<string>(
    (inner) => `if (flag) {\n${inner}}\n`,
    'return 2;\n',
  );

  return `export const deep = (flag: boolean): number => {\n${body
    .split('\n')
    .map((line) => (line ? `  ${line}` : line))
    .join('\n')}\n  return 1;\n};\n`;
};

const branches = (count: number) =>
  Array.from(
    { length: count },
    (_, index) =>
      `  if (value === ${index % 2}) {\n    return ${index % 2};\n  }\n`,
  ).join('\n');

const padded = (line: string, length: number) =>
  `${line}${' '.repeat(length - line.length - 1)};\n`;

describe('style rules', () => {
  it.each([
    [
      'var',
      `export const run = (): number => {\n  var total = 1;\n\n  return total;\n};\n`,
      'no-var',
    ],
    [
      'a let that is never reassigned',
      `export const run = (): number => {\n  let total = 1;\n\n  return total;\n};\n`,
      'prefer-const',
    ],
    [
      'a property that could use the shorthand',
      `const name = 'a';\n\nexport const person = { name: name };\n`,
      'object-shorthand',
    ],
    [
      'a rename to the same name',
      `const person = { name: 'a' };\nconst { name: name } = person;\n\nexport const copy = name;\n`,
      'no-useless-rename',
    ],
    [
      'a reassigned parameter',
      `export const run = (value: number): number => {\n  value = 2;\n\n  return value;\n};\n`,
      'no-param-reassign',
    ],
    [
      'a return without a blank line before it',
      `export const run = (): number => {\n  const total = 1;\n  return total;\n};\n`,
      '@stylistic/padding-line-between-statements',
    ],
    [
      'a return after a call without a blank line',
      `export const run = (items: number[]): number[] => {\n  items.splice(0);\n  return items;\n};\n`,
      '@stylistic/padding-line-between-statements',
    ],
    [
      'a declaration followed by a statement without a blank line',
      `export const run = (items: number[]): void => {\n  const total = 1;\n  items.splice(total);\n};\n`,
      '@stylistic/padding-line-between-statements',
    ],
    [
      'a block without a blank line before it',
      `export const run = (items: number[], flag: boolean): void => {\n  items.splice(0);\n  if (flag) {\n    items.splice(1);\n    items.splice(2);\n  }\n};\n`,
      '@stylistic/padding-line-between-statements',
    ],
    [
      'an unused variable',
      `export const run = (): number => {\n  const unused = 1;\n\n  return 2;\n};\n`,
      '@typescript-eslint/no-unused-vars',
    ],
    [
      'indexOf instead of includes',
      `export const run = (text: string): boolean => text.indexOf('a') !== -1;\n`,
      '@typescript-eslint/prefer-includes',
    ],
    [
      'filter()[0] instead of find',
      `export const run = (items: string[]): string | undefined => items.filter((item) => item === 'a')[0];\n`,
      '@typescript-eslint/prefer-find',
    ],
    [
      'bracket access with a literal key',
      `export const run = (item: { name: string }): string => item['name'];\n`,
      '@typescript-eslint/dot-notation',
    ],
    [
      'unsorted exports',
      `const a1 = 1;\nconst b1 = 2;\n\nexport { b1, a1 };\n`,
      'simple-import-sort/exports',
    ],
    [
      'two classes in one file',
      `export class First {}\n\nexport class Second {}\n`,
      'max-classes-per-file',
    ],
    [
      'a high-entropy string',
      `export const key = 'Zx9Qw3Lm7Vb2Nc8Hd5Ts1Kp6Rf4Jg0Yu8Be3';\n`,
      'no-secrets/no-secrets',
    ],
    [
      'a regex that can be optimised',
      `export const re = /[0-9]+/u;\n`,
      'optimize-regex/optimize-regex',
    ],
  ])('reports %s', async (_name, code, rule) => {
    expect(await rulesFor(code)).toContain(rule);
  });

  it('allows an unused rest sibling', async () => {
    const code = `export const rest = (input: { a1: number; b1: number }): { b1: number } => {\n  const { a1, ...others } = input;\n\n  return others;\n};\n`;

    expect(await rulesFor(code)).not.toContain(
      '@typescript-eslint/no-unused-vars',
    );
  });

  it('allows mutating a parameter property', async () => {
    const code = `export const run = (target: { value: number }): void => {\n  target.value = 3;\n};\n`;
    const rules = await rulesFor(code);

    expect(rules).not.toContain('no-param-reassign');
    expect(rules).not.toContain('functional/immutable-data');
  });

  it('allows blank lines between statements', async () => {
    const code = `export const run = (): number => {\n  const total = 1;\n\n  return total;\n};\n`;

    expect(await rulesFor(code)).toEqual([]);
  });

  it('allows consecutive declarations', async () => {
    const code = `export const run = (): number => {\n  const first = 1;\n  const second = 0;\n\n  return first + second;\n};\n`;

    expect(await rulesFor(code)).toEqual([]);
  });
});

describe('limits', () => {
  it.each([
    [
      'max-params',
      'two parameters',
      `export const add = (first: number, second: number): number => first + second;\n`,
      false,
    ],
    [
      'max-statements',
      'twenty statements',
      `export const run = (): number => {\n${statements(19)}\n  return v0;\n};\n`,
      false,
    ],
    [
      'max-statements',
      'twenty-one statements',
      `export const run = (): number => {\n${statements(20)}\n  return v0;\n};\n`,
      true,
    ],
    ['max-depth', 'depth four', nested(4), false],
    ['max-depth', 'depth five', nested(5), true],
    [
      'complexity',
      'complexity ten',
      `export const run = (value: number): number => {\n${branches(9)}\n  return 0;\n};\n`,
      false,
    ],
    [
      'complexity',
      'complexity eleven',
      `export const run = (value: number): number => {\n${branches(10)}\n  return 0;\n};\n`,
      true,
    ],
    ['max-lines-per-function', 'fifty lines', longFunction(45), false],
    ['max-lines-per-function', 'fifty-one lines', longFunction(46), true],
    [
      'max-lines',
      '250 lines',
      `export const all = [\n${"  'x',\n".repeat(248)}];\n`,
      false,
    ],
    [
      'max-lines',
      '251 lines',
      `export const all = [\n${"  'x',\n".repeat(249)}];\n`,
      true,
    ],
    [
      'max-len',
      '80 columns',
      padded(
        'export const total = (value: number): number => value + value',
        80,
      ),
      false,
    ],
    [
      'max-len',
      '81 columns',
      padded(
        'export const total = (value: number): number => value + value',
        81,
      ),
      true,
    ],
  ])(
    '%s allows or reports at the boundary: %s',
    async (rule, _name, code, reported) => {
      const rules = await rulesFor(code);

      expect(rules.includes(rule)).toBe(reported);
    },
  );

  it.each([
    [
      'a long URL string',
      `export const url = 'https://example.org/a/very/long/path/that/goes/on/and/on/and/on/forever/and/ever';\n`,
    ],
    [
      'a long template literal',
      'export const text = `a very long template literal that goes on and on and on and on and on`;\n',
    ],
    [
      'a long regular expression',
      `export const re = /a{2}b{2}c{2}d{2}e{2}f{2}g{2}h{2}i{2}j{2}k{2}l{2}m{2}n{2}o{2}p{2}q{2}r{2}s{2}/u;\n`,
    ],
  ])('max-len ignores %s', async (_name, code) => {
    expect(await rulesFor(code)).not.toContain('max-len');
  });

  it('max-len ignores long eslint directive comments', async () => {
    const code = `// eslint-disable-next-line no-console, no-var, no-magic-numbers, id-length, prefer-const, eqeqeq\nexport const value = 1;\n`;

    expect(await rulesFor(code)).not.toContain('max-len');
  });
});

describe('magic numbers and names', () => {
  it.each([
    [
      'zero, one, two and minus one',
      `export const run = (value: number): number => value * 2 + 1 - 0 + -1;\n`,
    ],
    [
      'an array index',
      `export const at = (list: number[]): number | undefined => list[5];\n`,
    ],
    ['an object property', `export const config = { timeout: 5000 };\n`],
  ])('allows %s', async (_name, code) => {
    expect(await rulesFor(code)).not.toContain('no-magic-numbers');
  });

  it('reports other numbers in expressions', async () => {
    const code = `export const run = (value: number): number => value * 3;\n`;

    expect(await rulesFor(code)).toContain('no-magic-numbers');
  });

  it('allows an underscore as a name', async () => {
    const code = `export const run = (_: number, used: number): number => used;\n`;

    expect(await rulesFor(code)).not.toContain('id-length');
  });

  it('reports a name that unicorn would abbreviate', async () => {
    const code = `export const run = (): number => {\n  const err = 1;\n\n  return err;\n};\n`;

    expect(await rulesFor(code)).toContain('unicorn/name-replacements');
  });
});

describe('draft exemption for immutable-data', () => {
  it.each([
    ['draft', `const draft = { name: 'a' };\n\ndraft.name = 'x';\n`],
    [
      'a draft-prefixed object',
      `const draftUser = { name: 'a' };\n\ndraftUser.name = 'x';\n`,
    ],
    [
      'a nested draft property',
      `const state = { draft: { name: 'a' } };\n\nstate.draft.name = 'x';\n`,
    ],
    [
      'a nested draft-prefixed property',
      `const state = { draftUser: { name: 'a' } };\n\nstate.draftUser.name = 'x';\n`,
    ],
  ])('allows mutating %s', async (_name, code) => {
    expect(await rulesFor(`${code}\nexport { };\n`)).not.toContain(
      'functional/immutable-data',
    );
  });

  it.each([
    [
      'a regular object',
      `const person = { name: 'a' };\n\nperson.name = 'x';\n`,
    ],
    ['an array push', `const items: number[] = [];\n\nitems.push(1);\n`],
  ])('reports mutating %s', async (_name, code) => {
    expect(await rulesFor(`${code}\nexport { };\n`)).toContain(
      'functional/immutable-data',
    );
  });
});

describe('file names', () => {
  it.each([
    ['kebab-case', 'src/kebab-case.ts', false],
    ['PascalCase', 'src/PascalCase.ts', false],
    ['camelCase', 'src/camelCase.ts', true],
    ['snake_case', 'src/bad_name.ts', true],
  ])('%s is reported only when not allowed', async (_name, file, reported) => {
    const rules = await rulesFor(`export const value = 1;\n`, file);

    expect(rules.includes('unicorn/filename-case')).toBe(reported);
  });
});

const OFF_SWITCHES: [string, string][] = [
  ['unicorn/no-null', `export const empty = (): null => null;\n`],
  [
    'unicorn/text-encoding-identifier-case',
    `import { readFileSync } from 'node:fs';\n\nexport const text = readFileSync('a.txt', 'UTF-8');\n`,
  ],
  [
    'unicorn/no-for-each',
    `export const run = (items: string[]): void => {\n  items.forEach((item) => String(item));\n};\n`,
  ],
  [
    'unicorn/class-reference-in-static-methods',
    `export class Box {\n  static one(): number {\n    return 1;\n  }\n\n  static two(): number {\n    return Box.one();\n  }\n}\n`,
  ],
  [
    'unicorn/consistent-class-member-order',
    `export class Box {\n  run(): void {}\n\n  value = 1;\n}\n`,
  ],
  [
    'unicorn/explicit-length-check',
    `export const has = (items: string[]): boolean => Boolean(items.length);\n`,
  ],
  [
    'unicorn/no-negated-condition',
    `export const pick = (flag: boolean): number => {\n  if (!flag) {\n    return 1;\n  } else {\n    return 0;\n  }\n};\n`,
  ],
  [
    'unicorn/prefer-ternary',
    `export const pick = (flag: boolean): number => {\n  if (flag) {\n    return 1;\n  } else {\n    return 0;\n  }\n};\n`,
  ],
  [
    'unicorn/prefer-early-return',
    `export const run = (flag: boolean, items: number[]): void => {\n  if (flag) {\n    items.splice(0);\n    items.splice(1);\n    items.splice(2);\n  }\n};\n`,
  ],
  [
    'unicorn/max-nested-calls',
    `declare const wrap: (value: number) => number;\n\nexport const total = wrap(wrap(wrap(wrap(1))));\n`,
  ],
  [
    'unicorn/prefer-simple-condition-first',
    `export const run = (flag: boolean, items: string[]): boolean => {\n  if (items.includes('a') && flag) {\n    return true;\n  }\n\n  return false;\n};\n`,
  ],
  [
    'unicorn/no-array-callback-reference',
    `const parse = (value: number): string => String(value);\n\nexport const strings = (items: number[]): string[] => items.map(parse);\n`,
  ],
  ['sonarjs/new-operator-misuse', `export const value = new Date.now();\n`],
  [
    'security/detect-object-injection',
    `export const read = (source: Record<string, number>, key: string): number | undefined => source[key];\n`,
  ],
  [
    'security-node/non-literal-reg-expr',
    `export const make = (input: string): RegExp => new RegExp(input, 'u');\n`,
  ],
  [
    'security-node/detect-insecure-randomness',
    `export const roll = (): number => Math.random();\n`,
  ],
  [
    'security-node/detect-non-literal-require-calls',
    `export const load = (name: string): unknown => require(name);\n`,
  ],
  [
    'n/no-missing-import',
    `import { thing } from 'does-not-exist-anywhere';\n\nexport const value = thing;\n`,
  ],
];

describe('rules that are switched off', () => {
  it.each(OFF_SWITCHES)('%s is off by default', async (rule, code) => {
    expect(await rulesFor(code)).not.toContain(rule);
  });

  it.each(OFF_SWITCHES)('%s would report if it were on', async (rule, code) => {
    expect(await lint({ file: SRC, code, options: enable(rule) })).toContain(
      rule,
    );
  });
});

describe('plugin presets', () => {
  it.each([
    [
      'unicorn',
      'unicorn/prefer-spread',
      `export const list = (items: Set<string>): string[] => Array.from(items);\n`,
    ],
    [
      'sonarjs',
      'sonarjs/code-eval',
      `export const run = (code: string): unknown => eval(code);\n`,
    ],
    [
      'security',
      'security/detect-eval-with-expression',
      `export const run = (code: string): unknown => eval(code);\n`,
    ],
    [
      'security-node',
      'security-node/detect-eval-with-expr',
      `export const run = (code: string): unknown => eval(code);\n`,
    ],
    [
      'no-unsanitized',
      'no-unsanitized/property',
      `export const set = (el: HTMLElement, html: string): void => {\n  el.innerHTML = html;\n};\n`,
    ],
    [
      'eslint-plugin-n',
      'n/no-process-exit',
      `export const stop = (): void => process.exit(1);\n`,
    ],
    [
      'typescript-eslint type-checked',
      '@typescript-eslint/require-await',
      `export const run = async (): Promise<number> => 1;\n`,
    ],
    [
      'typescript-eslint type-checked',
      '@typescript-eslint/no-misused-promises',
      `export const run = (items: number[]): void => {\n  items.forEach(async (item) => {\n    await Promise.resolve(item);\n  });\n};\n`,
    ],
    [
      'typescript-eslint type-checked',
      '@typescript-eslint/no-unnecessary-type-assertion',
      `export const run = (value: string): string => value as string;\n`,
    ],
    [
      'typescript-eslint type-checked',
      '@typescript-eslint/no-unsafe-assignment',
      `export const run = (): string => {\n  const value: string = JSON.parse('1');\n\n  return value;\n};\n`,
    ],
    [
      'typescript-eslint type-checked',
      '@typescript-eslint/await-thenable',
      `export const run = async (): Promise<number> => {\n  const value = await 1;\n\n  return value;\n};\n`,
    ],
  ])('wires in %s: %s', async (_name, rule, code) => {
    expect(await rulesFor(code)).toContain(rule);
  });
});

describe('json files', () => {
  it('allows comments', async () => {
    expect(await rulesFor(`// note\n{ "a": 1 }\n`, 'data.json')).toEqual([]);
  });

  it.each([
    ['a trailing comma', `{ "a": 1, }\n`],
    ['a missing value', `{ "a": }\n`],
  ])('reports %s', async (_name, code) => {
    expect(await rulesFor(code, 'data.json')).toContain('json/*');
  });

  it('skips package-lock.json', async () => {
    expect(await rulesFor(`{ "a": }\n`, 'package-lock.json')).not.toContain(
      'json/*',
    );
  });
});

describe('ignores', () => {
  const ignored = (messages: string[]) =>
    messages.some((message) => message.startsWith('File ignored'));

  it.each(['dist/a.ts', 'coverage/a.ts'])(
    'skips %s by default',
    async (file) => {
      expect(ignored(await rulesFor(`export const x = 1;\n`, file))).toBe(true);
    },
  );

  it('skips the globs passed in the ignores option', async () => {
    const code = `export const value = 1;\n`;
    const file = 'src/generated/a.ts';

    expect(ignored(await rulesFor(code, file))).toBe(false);
    expect(
      ignored(
        await lint({ file, code, options: { ignores: ['**/generated/'] } }),
      ),
    ).toBe(true);
  });
});

describe('nodeVersion', () => {
  const code = `export const copy = (value: object): object => structuredClone(value);\n`;

  it('accepts modern builtins by default', async () => {
    expect(await rulesFor(code)).not.toContain(
      'n/no-unsupported-features/node-builtins',
    );
  });

  it('reports builtins newer than the configured range', async () => {
    expect(
      await lint({
        file: SRC,
        code,
        options: { nodeVersion: '>=12.0.0' },
      }),
    ).toContain('n/no-unsupported-features/node-builtins');
  });
});

describe('directives and javascript files', () => {
  it('reports an unused disable directive', async () => {
    const rules = await rulesFor(
      `// eslint-disable-next-line no-console\nexport const value = 1;\n`,
    );

    expect(rules.some((rule) => rule.startsWith('Unused eslint-disable'))).toBe(
      true,
    );
  });

  it('allows a used disable directive', async () => {
    expect(
      await rulesFor(
        `// eslint-disable-next-line no-console\nexport const log = (): void => console.log('x');\n`,
      ),
    ).toEqual([]);
  });

  it('skips type-aware rules for javascript files', async () => {
    expect(await rulesFor(`Promise.resolve(1);\n`, 'scripts/new.js')).toEqual(
      [],
    );
  });
});
