import type { Linter } from 'eslint';

/** Bans `process.env` in `src/` with a custom message. */
export interface ProcessEnvRule {
  /** Shown in the lint error; say what to use instead. */
  message: string;
  /** Globs where `process.env` is still allowed. */
  allowedIn: string[];
}

export interface ConfigOptions {
  /** Directory of your tsconfig.json. Pass `import.meta.dirname`. */
  tsconfigRootDir: string;
  /** Import path aliases such as `@app`, sorted after packages. */
  importAliases?: string[];
  /** Globs to ignore, besides coverage and dist directories. */
  ignores?: string[];
  /** TypeScript files outside the tsconfig; type-aware rules are off. */
  untypedFiles?: string[];
  /** Node range checked by eslint-plugin-n. Default `'>=24.0.0'`. */
  nodeVersion?: string;
  /** Ban `process.env` in `src/`. Off by default. */
  processEnv?: ProcessEnvRule;
  /** Extra flat-config objects, appended last so they win. */
  overrides?: Linter.Config[];
}

/** Base config for TypeScript projects: functional style, security, no comments. */
export function createConfig(options: ConfigOptions): Linter.Config[];
