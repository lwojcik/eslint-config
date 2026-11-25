import { resolve } from 'node:path';

import { ESLint, type Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { createConfig } from '../index.js';
import { createReactConfig } from '../react.js';
import { FIXTURES } from './lint.js';

const lintTsx = async (code: string) => {
  const eslint = new ESLint({
    cwd: FIXTURES,
    overrideConfigFile: true,
    overrideConfig: [
      ...createConfig({ tsconfigRootDir: FIXTURES }),
      ...createReactConfig({ tsconfigRootDir: FIXTURES }),
    ] as Linter.Config[],
  });
  const [result] = await eslint.lintText(code, {
    filePath: resolve(FIXTURES, 'src/component.tsx'),
  });

  return result.messages.map((message) => message.ruleId ?? message.message);
};

describe('no-comments in tsx', () => {
  it('flags a JSX comment', async () => {
    expect(
      await lintTsx(`export const A = () => <div>{/* note */}</div>;\n`),
    ).toContain('no-comments/disallowComments');
  });

  it('flags a line comment', async () => {
    expect(
      await lintTsx(`// note\nexport const A = () => <div />;\n`),
    ).toContain('no-comments/disallowComments');
  });

  it('allows an eslint directive in JSX', async () => {
    expect(
      await lintTsx(
        `export const A = () => <div>{/* eslint-disable-next-line no-console */}</div>;\n`,
      ),
    ).not.toContain('no-comments/disallowComments');
  });
});
