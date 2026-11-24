import type { Linter } from 'eslint';

export interface NestjsConfigOptions {
  /** Keep the `@nestjs/swagger` rules on. Default `false`. */
  swagger?: boolean;
  /** Where to look for modules. Default is every .ts file under src; set in monorepos. */
  sourceGlobs?: string[];
  /** Extra flat-config objects, appended last. */
  overrides?: Linter.Config[];
}

/** NestJS rules for .ts files. Add after `createConfig`. */
export function createNestjsConfig(
  options?: NestjsConfigOptions,
): Linter.Config[];
