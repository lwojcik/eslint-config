import type { Linter } from 'eslint';

export interface ReactConfigOptions {
  /** Directory of your tsconfig.json. Pass `import.meta.dirname`. */
  tsconfigRootDir: string;
  /** Extra flat-config objects, appended last. */
  overrides?: Linter.Config[];
}

/** React and accessibility rules for .tsx files. Add after `createConfig`. */
export function createReactConfig(options: ReactConfigOptions): Linter.Config[];
