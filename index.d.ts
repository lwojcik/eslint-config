import type { Linter } from 'eslint';

export interface ProcessEnvRule {
  message: string;
  allowedIn: string[];
}

export interface ConfigOptions {
  tsconfigRootDir: string;
  importAliases?: string[];
  ignores?: string[];
  untypedFiles?: string[];
  nodeVersion?: string;
  processEnv?: ProcessEnvRule;
  overrides?: Linter.Config[];
}

export function createConfig(options: ConfigOptions): Linter.Config[];
