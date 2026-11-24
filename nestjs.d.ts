import type { Linter } from 'eslint';

export interface NestjsConfigOptions {
  swagger?: boolean;
  sourceGlobs?: string[];
  overrides?: Linter.Config[];
}

export function createNestjsConfig(
  options?: NestjsConfigOptions,
): Linter.Config[];
