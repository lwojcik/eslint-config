import type { Linter } from 'eslint';

export interface TanstackQueryConfigOptions {
  /** Extra flat-config objects, appended last. */
  overrides?: Linter.Config[];
}

/** TanStack Query rules for .ts and .tsx files. */
export function createTanstackQueryConfig(
  options?: TanstackQueryConfigOptions,
): Linter.Config[];
