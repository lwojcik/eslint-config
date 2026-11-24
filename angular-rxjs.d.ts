import type { Linter } from 'eslint';

export interface RxjsConfigOptions {
  untypedFiles?: string[];
  overrides?: Linter.Config[];
}

export function createRxjsConfig(options?: RxjsConfigOptions): Linter.Config[];
