import type { Linter } from 'eslint';

export interface AngularConfigOptions {
  /** Enforces selector and pipe naming with this prefix, e.g. `app`. */
  selectorPrefix?: string;
  /** Extra flat-config objects, appended last. */
  overrides?: Linter.Config[];
}

/** Angular rules for TypeScript files and templates. Add after `createConfig`. */
export function createAngularConfig(
  options?: AngularConfigOptions,
): Linter.Config[];
