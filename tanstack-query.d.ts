import type { Linter } from 'eslint';

export interface TanstackQueryConfigOptions {
  overrides?: Linter.Config[];
}

export function createTanstackQueryConfig(
  options?: TanstackQueryConfigOptions,
): Linter.Config[];
