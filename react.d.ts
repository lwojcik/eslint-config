import type { Linter } from 'eslint';

export interface ReactConfigOptions {
  tsconfigRootDir: string;
  overrides?: Linter.Config[];
}

export function createReactConfig(options: ReactConfigOptions): Linter.Config[];
