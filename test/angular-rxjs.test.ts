import { ESLint, type Linter } from 'eslint';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { createRxjsConfig } from '../angular-rxjs.js';
import { createConfig } from '../index.js';
import { FIXTURES } from './lint.js';

const FILE = 'src/example.ts';

const lintRxjs = async ({
  code,
  file = FILE,
  untypedFiles = [],
}: {
  code: string;
  file?: string;
  untypedFiles?: string[];
}) => {
  const eslint = new ESLint({
    cwd: FIXTURES,
    overrideConfigFile: true,
    overrideConfig: [
      ...createConfig({ tsconfigRootDir: FIXTURES, untypedFiles }),
      ...createRxjsConfig({ untypedFiles }),
    ] as Linter.Config[],
  });
  const [result] = await eslint.lintText(code, {
    filePath: resolve(FIXTURES, file),
  });

  return result.messages.map((message) => message.ruleId ?? message.message);
};

describe('createRxjsConfig', () => {
  it('lints clean observable code without errors', async () => {
    expect(
      await lintRxjs({
        code: `import { map, type Observable, of } from 'rxjs';\n\nexport const double = (source: Observable<number>): Observable<number> =>\n  source.pipe(map((value) => value * 2));\n\nexport const one = of(1);\n`,
      }),
    ).toEqual([]);
  });

  it('reports nested subscribes', async () => {
    expect(
      await lintRxjs({
        code: `import { of } from 'rxjs';\n\nof(1).subscribe({\n  error: console.error,\n  next: () => {\n    of(2).subscribe({ error: console.error, next: console.log });\n  },\n});\n`,
      }),
    ).toContain('rxjs-x/no-nested-subscribe');
  });

  it('reports subscribes without an error handler', async () => {
    expect(
      await lintRxjs({
        code: `import { of } from 'rxjs';\n\nof(1).subscribe(console.log);\n`,
      }),
    ).toContain('rxjs-x/no-ignored-error');
  });

  it('reports floating observables', async () => {
    expect(
      await lintRxjs({
        code: `import { of } from 'rxjs';\n\nof(1);\n`,
      }),
    ).toContain('rxjs-x/no-floating-observables');
  });

  it('reports exposed subjects', async () => {
    expect(
      await lintRxjs({
        code: `import { Subject } from 'rxjs';\n\nexport class Bus {\n  readonly events = new Subject<string>();\n}\n`,
      }),
    ).toContain('rxjs-x/no-exposed-subjects');
  });
});

describe('untypedFiles', () => {
  const code = `import { of } from 'rxjs';\n\nof(1);\n`;

  it('are skipped, so type-aware rules do not crash', async () => {
    expect(
      await lintRxjs({
        code,
        file: 'scripts/a.ts',
        untypedFiles: ['**/scripts/a.ts'],
      }),
    ).not.toContain('rxjs-x/no-floating-observables');
  });
});

describe('overrides', () => {
  it('come last', () => {
    const override = { rules: { 'no-console': 'off' } } as Linter.Config;

    expect(createRxjsConfig({ overrides: [override] }).at(-1)).toMatchObject(
      override,
    );
  });
});

describe('package export', () => {
  it('resolves the /angular/rxjs subpath', async () => {
    const exported = await import('@lwojcik/eslint-config/angular/rxjs');

    expect(exported.createRxjsConfig).toBe(createRxjsConfig);
  });
});
