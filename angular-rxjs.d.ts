import type { Linter } from 'eslint';

export interface RxjsConfigOptions {
  /** The same globs passed to `createConfig`; these rules need types. */
  untypedFiles?: string[];
  /** Extra flat-config objects, appended last. */
  overrides?: Linter.Config[];
}

/** Strict RxJS rules for TypeScript files. Works in any project using RxJS. */
export function createRxjsConfig(options?: RxjsConfigOptions): Linter.Config[];
