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

describe('imports without aliases', () => {
  const PACKAGES_FIRST = `import { b } from 'node:fs';\n\nimport { c } from 'vitest';\n\nimport { a } from './a';\n\nexport const all = [a, b, c];\n`;
  const RELATIVE_FIRST = `import { a } from './a';\n\nimport { b } from 'node:fs';\n\nimport { c } from 'vitest';\n\nexport const all = [a, b, c];\n`;

  it('sorts packages before relative imports', async () => {
    expect(await lint({ file: FILE, code: PACKAGES_FIRST })).not.toContain(
      'simple-import-sort/imports',
    );
    expect(await lint({ file: FILE, code: RELATIVE_FIRST })).toContain(
      'simple-import-sort/imports',
    );
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

describe('importAliases with a bare @', () => {
  const options = { importAliases: ['@'] };
  const code = `import { useQuery } from '@tanstack/react-query';\nimport { useState } from 'react';\n\nimport { environment } from '@/config/environment';\n\nimport { local } from './local';\n\nexport const all = [useQuery, useState, environment, local];\n`;

  it('keeps scoped packages in the packages group', async () => {
    expect(await lint({ file: FILE, code, options })).not.toContain(
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
