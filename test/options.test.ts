import { describe, expect, it } from 'vitest';

import { lint } from './lint.js';

const FILE = 'src/example.ts';
const ENV = `export const home = (): string | undefined => process.env.HOME;\n`;
const ALIASED = `import { a } from '@app/a';\nimport { b } from 'node:fs';\n\nexport const both = [a, b];\n`;
const ORDERED = `import { b } from 'node:fs';\n\nimport { a } from '@app/a';\n\nexport const both = [a, b];\n`;

describe('processEnv', () => {
  const processEnv = { message: 'use deps', allowedIn: ['**/src/deps.ts'] };

  it('is allowed when the option is not set', async () => {
    expect(await lint({ file: FILE, code: ENV })).not.toContain(
      'no-restricted-properties',
    );
  });

  it('is banned in src/ when the option is set', async () => {
    expect(
      await lint({ file: FILE, code: ENV, options: { processEnv } }),
    ).toContain('no-restricted-properties');
  });

  it('is allowed in the allowedIn files', async () => {
    expect(
      await lint({ file: 'src/deps.ts', code: ENV, options: { processEnv } }),
    ).not.toContain('no-restricted-properties');
  });
});

describe('importAliases', () => {
  const options = { importAliases: ['@app'] };

  it('sorts an alias after packages', async () => {
    expect(await lint({ file: FILE, code: ORDERED, options })).not.toContain(
      'simple-import-sort/imports',
    );
    expect(await lint({ file: FILE, code: ALIASED, options })).toContain(
      'simple-import-sort/imports',
    );
  });
});

describe('overrides', () => {
  it('come last and win', async () => {
    const code = `export const wait = (): number => 4242;\n`;

    expect(await lint({ file: FILE, code })).toContain('no-magic-numbers');
    expect(
      await lint({
        file: FILE,
        code,
        options: {
          overrides: [
            { files: ['**/*.ts'], rules: { 'no-magic-numbers': 'off' } },
          ],
        },
      }),
    ).not.toContain('no-magic-numbers');
  });
});

describe('untypedFiles', () => {
  it('skips type-aware rules for the listed files', async () => {
    const code = `export const run = async (): Promise<void> => {\n  Promise.resolve(1);\n};\n`;

    expect(await lint({ file: FILE, code })).toContain(
      '@typescript-eslint/no-floating-promises',
    );
    expect(
      await lint({
        file: FILE,
        code,
        options: { untypedFiles: ['**/src/example.ts'] },
      }),
    ).not.toContain('@typescript-eslint/no-floating-promises');
  });
});
