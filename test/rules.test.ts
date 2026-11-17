import { describe, expect, it } from 'vitest';

import { lint } from './lint.js';

const SRC = 'src/example.ts';

const rulesFor = (code: string, file = SRC) => lint({ file, code });

describe('clean code', () => {
  it('passes', async () => {
    const code = `export const double = (value: number): number => value * 2;\n`;

    expect(await rulesFor(code)).toEqual([]);
  });
});

describe('rules in src/', () => {
  it.each([
    [
      'loops',
      `export const sum = (values: number[]): number => {\n  const total = [0];\n\n  for (const value of values) {\n    total.push(value);\n  }\n\n  return total.length;\n};\n`,
      'no-restricted-syntax',
    ],
    [
      'let',
      `export const value = (): number => {\n  let result = 1;\n\n  result = 2;\n\n  return result;\n};\n`,
      'no-restricted-syntax',
    ],
    [
      'more than two parameters',
      `export const add = (first: number, second: number, third: number): number =>\n  first + second + third;\n`,
      'max-params',
    ],
    [
      'comments',
      `// a comment\nexport const value = 1;\n`,
      'no-comments/disallowComments',
    ],
    [
      'mutation of existing data',
      `export const rename = (): void => {\n  const person = { name: 'a' };\n\n  person.name = 'x';\n};\n`,
      'functional/immutable-data',
    ],
    [
      'console',
      `export const log = (): void => {\n  console.log('x');\n};\n`,
      'no-console',
    ],
    [
      'magic numbers',
      `export const wait = (): number => 4242;\n`,
      'no-magic-numbers',
    ],
    [
      'one-letter names',
      `export const value = (): number => {\n  const x = 3;\n\n  return x;\n};\n`,
      'id-length',
    ],
    [
      'unsorted imports',
      `import { b } from 'node:path';\nimport { a } from 'node:fs';\n\nexport const both = [a, b];\n`,
      'simple-import-sort/imports',
    ],
    [
      'loose equality',
      `export const same = (a1: number, b1: number): boolean => a1 == b1;\n`,
      'eqeqeq',
    ],
  ])('reports %s', async (_name, code, rule) => {
    expect(await rulesFor(code)).toContain(rule);
  });
});

describe('scope', () => {
  it('leaves the function style rules off outside src/', async () => {
    const code = `export const log = (): void => {\n  console.log(4242);\n};\n`;

    expect(await rulesFor(code, 'scripts/example.ts')).toEqual([]);
  });

  it('still bans comments outside src/', async () => {
    expect(
      await rulesFor(`// a comment\nexport const value = 1;\n`, 'scripts/a.ts'),
    ).toContain('no-comments/disallowComments');
  });

  it('allows magic numbers in src/config.ts', async () => {
    expect(
      await rulesFor(`export const LIMIT = 4242;\n`, 'src/config.ts'),
    ).toEqual([]);
  });

  it('allows loose typing in tests', async () => {
    const code = `export const read = (input: any): unknown => input.value;\n`;

    expect(await rulesFor(code, 'test/example.ts')).toEqual([]);
    expect(await rulesFor(code, 'src/example.ts')).toContain(
      '@typescript-eslint/no-explicit-any',
    );
  });
});
