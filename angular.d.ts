import type { Linter } from 'eslint';

export interface AngularConfigOptions {
  selectorPrefix?: string;
  overrides?: Linter.Config[];
}

export function createAngularConfig(
  options?: AngularConfigOptions,
): Linter.Config[];
