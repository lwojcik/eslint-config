import { ESLint, type Linter } from 'eslint';
import { resolve } from 'node:path';

import { createConfig, type ConfigOptions } from '../index.js';

export const FIXTURES = resolve(import.meta.dirname, 'fixtures');

export const lint = async ({
  file,
  code,
  options = {},
}: {
  file: string;
  code: string;
  options?: Partial<ConfigOptions>;
}): Promise<string[]> => {
  const eslint = new ESLint({
    cwd: FIXTURES,
    overrideConfigFile: true,
    overrideConfig: createConfig({
      tsconfigRootDir: FIXTURES,
      ...options,
    }) as Linter.Config[],
  });
  const [result] = await eslint.lintText(code, {
    filePath: resolve(FIXTURES, file),
  });

  return result.messages.map((message) => message.ruleId ?? message.message);
};
