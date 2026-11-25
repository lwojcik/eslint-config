import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..');

interface ExportTarget {
  types: string;
  default: string;
}

interface PackageJson {
  exports: Record<string, ExportTarget>;
  files: string[];
  peerDependencies: Record<string, string>;
  peerDependenciesMeta: Record<string, { optional: boolean }>;
}

const pkg = JSON.parse(
  readFileSync(resolve(ROOT, 'package.json'), 'utf8'),
) as PackageJson;

const targets = Object.entries(pkg.exports).flatMap(([subpath, target]) => [
  [subpath, target.types],
  [subpath, target.default],
]);

describe('package.json', () => {
  it.each(targets)('export %s points to an existing file: %s', (_, target) => {
    expect(existsSync(resolve(ROOT, target))).toBe(true);
  });

  it.each(targets)('export %s lists %s in files', (_, target) => {
    expect(pkg.files).toContain(target.replace('./', ''));
  });

  it('ships every file that an export target imports', () => {
    const imported = [...new Set(targets.map(([, target]) => target))]
      .filter((target) => target.endsWith('.js'))
      .flatMap((target) =>
        [
          ...readFileSync(resolve(ROOT, target), 'utf8').matchAll(
            /from '\.\/([^']+)'/g,
          ),
        ].map(([, file]) => file),
      );

    expect(imported.length).toBeGreaterThan(0);
    expect(imported.filter((file) => !pkg.files.includes(file))).toEqual([]);
  });

  it('lists only files that exist', () => {
    expect(
      pkg.files.filter((file) => !existsSync(resolve(ROOT, file))),
    ).toEqual([]);
  });

  it('marks every framework plugin as an optional peer', () => {
    const plugins = [
      '@eslint-react/eslint-plugin',
      'eslint-plugin-jsx-a11y-x',
      'angular-eslint',
      'eslint-plugin-rxjs-x',
      '@tanstack/eslint-plugin-query',
      '@darraghor/eslint-plugin-nestjs-typed',
    ];

    expect(plugins.filter((name) => !(name in pkg.peerDependencies))).toEqual(
      [],
    );
    expect(
      plugins.filter((name) => !pkg.peerDependenciesMeta[name]?.optional),
    ).toEqual([]);
  });
});
