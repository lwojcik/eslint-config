import { describe, expect, it } from 'vitest';

import { type ConfigOptions } from '../index.js';
import { lint } from './lint.js';

const FILE = 'src/example.ts';
const RULE = 'xss/no-location-href-assign';

const assign = (target: string, value: string) =>
  `export const go = (url: string): void => {\n  ${target} = ${value};\n};\n`;

describe('xss/no-location-href-assign', () => {
  it.each([
    ['location.href', 'location.href'],
    ['window.location.href', 'window.location.href'],
    ['document.location.href', 'document.location.href'],
    ['a computed href', "location['href']"],
  ])('reports an assignment to %s', async (_name, target) => {
    expect(await lint({ file: FILE, code: assign(target, 'url') })).toContain(
      RULE,
    );
  });

  it.each([
    ['another property of location', 'location.hash', 'url'],
    ['href on another object', 'link.href', 'url'],
    ['a computed non-href property', "location['hash']", 'url'],
    ['a computed variable property', 'location[key]', 'url'],
    ['an assignment to a plain variable', 'link', 'url'],
    ['an escaped value', 'location.href', 'escape(url)'],
  ])('allows %s', async (_name, target, value) => {
    const code = `declare const link: { href: string };\ndeclare const key: 'hash';\ndeclare const escape: (value: string) => string;\n\nexport const go = (url: string): void => {\n  ${target} = ${value};\n};\n`;

    expect(await lint({ file: FILE, code })).not.toContain(RULE);
  });

  describe('with a custom escapeFunc', () => {
    const options: Partial<ConfigOptions> = {
      overrides: [
        {
          files: ['**/*.ts'],
          rules: { [RULE]: ['error', { escapeFunc: 'utils.sanitize' }] },
        },
      ],
    };
    const declarations = `declare const utils: { sanitize: (value: string) => string };\ndeclare const escape: (value: string) => string;\n\n`;

    it('allows the configured wrapper', async () => {
      const code = `${declarations}${assign('location.href', 'utils.sanitize(url)')}`;

      expect(await lint({ file: FILE, code, options })).not.toContain(RULE);
    });

    it('reports the default wrapper', async () => {
      const code = `${declarations}${assign('location.href', 'escape(url)')}`;

      expect(await lint({ file: FILE, code, options })).toContain(RULE);
    });
  });

  it('does not crash on ESLint 10', async () => {
    await expect(
      lint({ file: FILE, code: assign('location.href', 'url') }),
    ).resolves.toBeInstanceOf(Array);
  });
});
