import { ESLint, type Linter } from 'eslint';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { createConfig } from '../index.js';
import { createReactConfig } from '../react.js';
import { FIXTURES } from './lint.js';

const lintReact = async (code: string, file = 'src/component.tsx') => {
  const eslint = new ESLint({
    cwd: FIXTURES,
    overrideConfigFile: true,
    overrideConfig: [
      ...createConfig({ tsconfigRootDir: FIXTURES }),
      ...createReactConfig({ tsconfigRootDir: FIXTURES }),
    ] as Linter.Config[],
  });
  const [result] = await eslint.lintText(code, {
    filePath: resolve(FIXTURES, file),
  });

  return result.messages.map((message) => ({
    id: message.ruleId ?? message.message,
    severity: message.severity,
  }));
};

describe('createReactConfig', () => {
  it('reports a missing key as an error', async () => {
    const messages = await lintReact(
      `export const List = ({ items }: { items: string[] }) => <ul>{items.map((item) => <li>{item}</li>)}</ul>;\n`,
    );

    expect(messages).toContainEqual({
      id: '@eslint-react/no-missing-key',
      severity: 2,
    });
  });

  it('promotes warnings to errors', async () => {
    const messages = await lintReact(
      `export const Html = ({ html }: { html: string }) => <div dangerouslySetInnerHTML={{ __html: html }} />;\n`,
    );

    expect(messages).toContainEqual({
      id: '@eslint-react/dom-no-dangerously-set-innerhtml',
      severity: 2,
    });
  });

  it('reports accessibility problems', async () => {
    const messages = await lintReact(
      `export const Picture = () => <img src="a.png" />;\n`,
    );

    expect(messages).toContainEqual({
      id: 'jsx-a11y-x/alt-text',
      severity: 2,
    });
  });

  it('allows components up to 100 lines', async () => {
    const body = Array.from({ length: 70 }, () => '<p>text</p>').join('\n');
    const messages = await lintReact(
      `export const Long = () => (\n<div>\n${body}\n</div>\n);\n`,
    );

    expect(messages.map(({ id }) => id)).not.toContain(
      'max-lines-per-function',
    );
  });

  it('reports components over 100 lines', async () => {
    const body = Array.from({ length: 110 }, () => '<p>text</p>').join('\n');
    const messages = await lintReact(
      `export const Long = () => (\n<div>\n${body}\n</div>\n);\n`,
    );

    expect(messages.map(({ id }) => id)).toContain('max-lines-per-function');
  });

  it('lints only tsx files', async () => {
    const messages = await lintReact(
      `export const value = [1, 2].map((item) => item);\n`,
      'src/example.ts',
    );

    expect(messages.map(({ id }) => id)).not.toContain(
      '@eslint-react/no-missing-key',
    );
  });

  it('appends overrides last', () => {
    const override = { rules: { 'no-console': 'off' } } as Linter.Config;
    const config = createReactConfig({
      tsconfigRootDir: FIXTURES,
      overrides: [override],
    });

    expect(config.at(-1)).toMatchObject(override);
  });
});
