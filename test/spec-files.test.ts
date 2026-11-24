import { describe, expect, it } from 'vitest';

import { lint } from './lint.js';

const CASES = Array.from(
  { length: 30 },
  (_, index) =>
    `  it('case ${index}', () => {\n    expect(${index + 3} * 7).toBe(${index * 21 + 21});\n  });\n`,
).join('\n');

const SPEC = `import { describe, expect, it } from 'vitest';\n\ndescribe('suite', () => {\n${CASES}});\n`;

describe('colocated spec and test files in src/', () => {
  it.each([
    ['a .spec.ts file', 'src/app.component.spec.ts'],
    ['a .test.tsx file', 'src/Counter.test.tsx'],
  ])('relax the size and magic-number rules in %s', async (_name, file) => {
    const rules = await lint({ file, code: SPEC });

    expect(rules).not.toContain('no-magic-numbers');
    expect(rules).not.toContain('max-lines-per-function');
    expect(rules).not.toContain('max-statements');
    expect(rules).not.toContain('max-lines');
  });

  it('still apply the other rules', async () => {
    const rules = await lint({
      file: 'src/app.component.spec.ts',
      code: `export const total = (): number => {\n  let result = 1;\n\n  result = 2;\n\n  return result;\n};\n`,
    });

    expect(rules).toContain('no-restricted-syntax');
  });

  it('relax the unsafe rules', async () => {
    const rules = await lint({
      file: 'src/app.component.spec.ts',
      code: `export const name = (value: any): string => value.name;\n`,
    });

    expect(rules).not.toContain('@typescript-eslint/no-explicit-any');
    expect(rules).not.toContain('@typescript-eslint/no-unsafe-member-access');
  });

  it('do not relax regular source files', async () => {
    const rules = await lint({
      file: 'src/example.ts',
      code: SPEC,
    });

    expect(rules).toContain('no-magic-numbers');
    expect(rules).toContain('max-lines-per-function');
  });
});
