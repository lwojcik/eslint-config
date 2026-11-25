import { resolve } from 'node:path';

import { ESLint, type Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { createAngularConfig } from '../angular.js';
import { createConfig } from '../index.js';
import { createTanstackQueryConfig } from '../tanstack-query.js';
import { FIXTURES } from './lint.js';

const eslint = new ESLint({
  cwd: FIXTURES,
  overrideConfigFile: true,
  overrideConfig: [
    ...createConfig({ tsconfigRootDir: FIXTURES }),
    ...createTanstackQueryConfig(),
  ] as Linter.Config[],
});

const lintQuery = async (code: string, file = 'src/example.ts') => {
  const [result] = await eslint.lintText(code, {
    filePath: resolve(FIXTURES, file),
  });

  return result.messages.map((message) => message.ruleId ?? message.message);
};

const CLEAN = `import { queryOptions, useQuery } from '@tanstack/react-query';

export const todoOptions = (id: number) =>
  queryOptions({
    queryFn: () => Promise.resolve(String(id)),
    queryKey: ['todo', id],
  });

export const useTodo = (id: number) => useQuery(todoOptions(id));
`;

const CASES: Record<string, string> = {
  'exhaustive-deps': `import { useQuery } from '@tanstack/react-query';\n\nexport const fetchTodo = (id: number): Promise<string> => Promise.resolve(String(id));\n\nexport const useTodo = (id: number) =>\n  useQuery({ queryFn: () => fetchTodo(id), queryKey: ['todo'] });\n`,
  'no-rest-destructuring': `import { queryOptions, useQuery } from '@tanstack/react-query';\n\nconst options = queryOptions({ queryFn: () => Promise.resolve(1), queryKey: ['n'] });\n\nexport const useN = () => {\n  const { data, ...rest } = useQuery(options);\n\n  return { data, rest };\n};\n`,
  'no-unstable-deps': `import { useMutation } from '@tanstack/react-query';\nimport { useEffect } from 'react';\n\nexport const useRun = () => {\n  const mutation = useMutation({ mutationFn: () => Promise.resolve(1) });\n\n  useEffect(() => {\n    mutation.mutate();\n  }, [mutation]);\n};\n`,
  'infinite-query-property-order': `import { useInfiniteQuery } from '@tanstack/react-query';\n\nexport const usePages = () =>\n  useInfiniteQuery({\n    getNextPageParam: () => 1,\n    initialPageParam: 0,\n    queryFn: () => Promise.resolve(1),\n    queryKey: ['pages'],\n  });\n`,
  'no-void-query-fn': `import { queryOptions } from '@tanstack/react-query';\n\nexport const options = queryOptions({\n  queryFn: async () => {\n    await Promise.resolve(1);\n  },\n  queryKey: ['void'],\n});\n`,
  'mutation-property-order': `import { useMutation } from '@tanstack/react-query';\n\nexport const useSave = () =>\n  useMutation({\n    mutationFn: (value: number) => Promise.resolve(value),\n    onError: () => 1,\n    onMutate: () => 1,\n  });\n`,
  'prefer-query-options': `import { useQuery } from '@tanstack/react-query';\n\nexport const useN = () =>\n  useQuery({ queryFn: () => Promise.resolve(1), queryKey: ['n'] });\n`,
};

const STABLE_CLIENT = `import { QueryClient, QueryClientProvider } from '@tanstack/react-query';\n\nexport const App = () => {\n  const queryClient = new QueryClient();\n\n  return <QueryClientProvider client={queryClient}>{null}</QueryClientProvider>;\n};\n`;

describe('createTanstackQueryConfig', () => {
  it('lints correct query code without errors', async () => {
    expect(await lintQuery(CLEAN)).toEqual([]);
  });

  it.each(Object.entries(CASES))('reports %s', async (name, code) => {
    expect(await lintQuery(code)).toContain(`@tanstack/query/${name}`);
  });

  it('reports an unstable query client in a tsx file', async () => {
    expect(await lintQuery(STABLE_CLIENT, 'src/component.tsx')).toContain(
      '@tanstack/query/stable-query-client',
    );
  });

  it('leaves no query rule at warning level', async () => {
    const config = await eslint.calculateConfigForFile(
      resolve(FIXTURES, 'src/example.ts'),
    );
    const levels = Object.entries(config?.rules ?? {})
      .filter(([name]) => name.startsWith('@tanstack/query/'))
      .map(([, value]) => (Array.isArray(value) ? value[0] : value));

    expect(levels).toHaveLength(8);
    expect(levels).not.toContain(1);
    expect(levels).not.toContain('warn');
  });
});

describe('in an Angular project', () => {
  const angular = new ESLint({
    cwd: FIXTURES,
    overrideConfigFile: true,
    overrideConfig: [
      ...createConfig({ tsconfigRootDir: FIXTURES }),
      ...createAngularConfig(),
      ...createTanstackQueryConfig(),
    ] as Linter.Config[],
  });

  const lintAngular = async (code: string) => {
    const [result] = await angular.lintText(code, {
      filePath: resolve(FIXTURES, 'src/app.component.ts'),
    });

    return result.messages.map((message) => message.ruleId ?? message.message);
  };

  const component = (body: string) =>
    `import { ChangeDetectionStrategy, Component, input } from '@angular/core';\nimport { injectQuery, queryOptions } from '@tanstack/angular-query';\n\nexport const todoOptions = (id: number) =>\n  queryOptions({\n    queryFn: () => Promise.resolve(String(id)),\n    queryKey: ['todo', id],\n  });\n\n@Component({ selector: 'app-x', template: '', changeDetection: ChangeDetectionStrategy.OnPush })\nexport class XComponent {\n  readonly id = input.required<number>();\n${body}\n}\n`;

  it('lints injectQuery with queryOptions clean', async () => {
    expect(
      await lintAngular(
        component(
          `  readonly todo = injectQuery(() => todoOptions(this.id()));`,
        ),
      ),
    ).toEqual([]);
  });

  it('reports missing query key dependencies in queryOptions', async () => {
    expect(
      await lintAngular(
        `import { queryOptions } from '@tanstack/angular-query';\n\nexport const todoOptions = (id: number) =>\n  queryOptions({ queryFn: () => Promise.resolve(String(id)), queryKey: ['todo'] });\n`,
      ),
    ).toContain('@tanstack/query/exhaustive-deps');
  });

  it('reports a void queryFn in queryOptions', async () => {
    expect(
      await lintAngular(
        `import { queryOptions } from '@tanstack/angular-query';\n\nexport const options = queryOptions({\n  queryFn: async () => {\n    await Promise.resolve(1);\n  },\n  queryKey: ['void'],\n});\n`,
      ),
    ).toContain('@tanstack/query/no-void-query-fn');
  });

  it('does not check options written inline in injectQuery', async () => {
    expect(
      await lintAngular(
        component(
          `  readonly todo = injectQuery(() => ({\n    queryFn: () => Promise.resolve(String(this.id())),\n    queryKey: ['todo'],\n  }));`,
        ),
      ),
    ).not.toContain('@tanstack/query/exhaustive-deps');
  });
});

describe('overrides', () => {
  it('come last', () => {
    const override = { rules: { 'no-console': 'off' } } as Linter.Config;

    expect(
      createTanstackQueryConfig({ overrides: [override] }).at(-1),
    ).toMatchObject(override);
  });
});

describe('package export', () => {
  it('resolves the /tanstack-query subpath', async () => {
    const exported = await import('@lwojcik/eslint-config/tanstack-query');

    expect(exported.createTanstackQueryConfig).toBe(createTanstackQueryConfig);
  });
});
