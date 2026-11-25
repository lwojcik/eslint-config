import { resolve } from 'node:path';

import { ESLint, type Linter } from 'eslint';
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

const CLEAN_COMPONENT = `import { useRef, useState } from 'react';

interface CounterProps {
  readonly label: string;
  readonly onChange: (value: number) => void;
}

export const Counter = ({ label, onChange }: CounterProps) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLButtonElement>(null);

  const increment = () => {
    setCount(count + 1);
    onChange(count + 1);
  };

  return (
    <button ref={ref} type="button" onClick={increment}>
      {label}: {count}
    </button>
  );
};
`;

const ids = (messages: { id: string }[]) => messages.map(({ id }) => id);

describe('a realistic component', () => {
  it('lints clean', async () => {
    expect(await lintReact(CLEAN_COMPONENT)).toEqual([]);
  });

  it('allows a PascalCase component file name', async () => {
    expect(await lintReact(CLEAN_COMPONENT, 'src/Counter.tsx')).toEqual([]);
  });

  it('still renames other abbreviations', async () => {
    const messages = await lintReact(
      `export const Box = (cb: () => string) => <p>{cb()}</p>;\n`,
    );

    expect(ids(messages)).toContain('unicorn/name-replacements');
  });
});

describe('react rules', () => {
  it('reports hooks called conditionally', async () => {
    const messages = await lintReact(
      `import { useState } from 'react';\n\nexport const Box = ({ on }: { on: boolean }) => {\n  if (on) {\n    useState(0);\n  }\n\n  return <p />;\n};\n`,
    );

    expect(ids(messages)).toContain('@eslint-react/rules-of-hooks');
  });

  it('reports leaked conditional rendering', async () => {
    const messages = await lintReact(
      `export const Box = ({ total }: { total: number }) => <div>{total && <p />}</div>;\n`,
    );

    expect(ids(messages)).toContain(
      '@eslint-react/no-leaked-conditional-rendering',
    );
  });
});

describe('base rules on tsx', () => {
  it('bans let', async () => {
    const messages = await lintReact(
      `export const Box = () => {\n  let total = 1;\n\n  return <p>{total}</p>;\n};\n`,
    );

    expect(ids(messages)).toContain('no-restricted-syntax');
  });

  it('bans magic numbers', async () => {
    const messages = await lintReact(
      `export const Box = ({ count }: { count: number }) => <p>{count * 4242}</p>;\n`,
    );

    expect(ids(messages)).toContain('no-magic-numbers');
  });

  it('relaxes unsafe rules in test files', async () => {
    const messages = await lintReact(
      `export const Box = (value: any) => <p>{value.name}</p>;\n`,
      'test/box.test.tsx',
    );

    expect(ids(messages)).not.toContain('@typescript-eslint/no-explicit-any');
  });
});

describe('severity', () => {
  it('leaves no react or a11y rule at warning level', async () => {
    const eslint = new ESLint({
      cwd: FIXTURES,
      overrideConfigFile: true,
      overrideConfig: [
        ...createConfig({ tsconfigRootDir: FIXTURES }),
        ...createReactConfig({ tsconfigRootDir: FIXTURES }),
      ] as Linter.Config[],
    });
    const config = await eslint.calculateConfigForFile(
      resolve(FIXTURES, 'src/component.tsx'),
    );
    const rules = Object.entries(config?.rules ?? {}).filter(([name]) =>
      /^(@eslint-react|jsx-a11y-x)\//.test(name),
    );
    const levels = rules.map(([, value]) =>
      Array.isArray(value) ? value[0] : value,
    );

    expect(rules.length).toBeGreaterThan(50);
    expect(levels).not.toContain(1);
    expect(levels).not.toContain('warn');
  });
});

describe('package export', () => {
  it('resolves the /react subpath', async () => {
    const exported = await import('@lwojcik/eslint-config/react');

    expect(exported.createReactConfig).toBe(createReactConfig);
  });
});
