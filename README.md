# @lwojcik/eslint-config

[![npm version](https://img.shields.io/npm/v/%40lwojcik%2Feslint-config)](https://www.npmjs.com/package/@lwojcik/eslint-config)
[![codecov](https://codecov.io/gh/lwojcik/eslint-config/graph/badge.svg)](https://codecov.io/gh/lwojcik/eslint-config)
[![Build status](https://ci.appveyor.com/api/projects/status/9tc4d79iibn1rmeq/branch/main?svg=true)](https://ci.appveyor.com/project/lwojcik/lwojcik-eslint-config/branch/main)

A heavily opinionated ESLint config factory for TypeScript projects, focused on enforcing functional style and security.

## Install

```sh
npm install --save-dev --save-exact @lwojcik/eslint-config eslint typescript typescript-eslint
```

Pin an exact version: a major bump of a bundled plugin (unicorn, sonarjs, ...) can add failures to your whole codebase, so it should reach you as a version change you choose.

## Use

```js
// eslint.config.js
import { createConfig } from '@lwojcik/eslint-config';

export default createConfig({
  tsconfigRootDir: import.meta.dirname,
  importAliases: ['@app'],
  ignores: ['**/generated/'],
});
```

`createConfig` returns an array of flat-config objects. Your `overrides` are appended last, so they win.

## Options

| Option            | Type                               | Default      | Meaning                                                                                                                         |
| ----------------- | ---------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `tsconfigRootDir` | `string`                           | required     | Directory of your `tsconfig.json`, for type-aware linting. Pass `import.meta.dirname`.                                          |
| `importAliases`   | `string[]`                         | `[]`         | Path aliases such as `@app`, each sorted into its own import group after the packages and before relative imports.              |
| `ignores`         | `string[]`                         | `[]`         | Globs to ignore, besides `**/coverage/` and `**/dist/`.                                                                         |
| `untypedFiles`    | `string[]`                         | `[]`         | TypeScript files outside your tsconfig; type-aware rules are switched off for them.                                             |
| `nodeVersion`     | `string`                           | `'>=24.0.0'` | The Node range `eslint-plugin-n` checks against.                                                                                |
| `processEnv`      | `{ message, allowedIn: string[] }` | off          | Bans `process.env` in `src/` with your message, except in the `allowedIn` globs (for example where you inject the environment). |
| `overrides`       | `Linter.Config[]`                  | `[]`         | Extra flat-config objects, appended last.                                                                                       |

## What it enforces

Rules apply to `**/src/**/*.ts` unless noted.

- **Base:** `@eslint/js` recommended and typescript-eslint's type-checked recommended set, with unused disable directives reported as errors.
- **Functional style:** loops and `let` are banned (use `map`, `filter`, `reduce`, `const`), and `functional/immutable-data` forbids mutating existing values. A variable named `draft…` is exempt, for immer drafts.
- **Size limits:** at most 2 parameters per function, 20 statements, 50 lines per function, 250 lines per file, nesting depth 4, complexity 10, one class per file, no magic numbers (except in `src/config.ts`), identifiers of at least 2 characters.
- **No comments:** every comment is an error except `eslint` and `global` directives (all files, including tests).
- **Imports:** sorted with `simple-import-sort`, in the groups: side effects, `node:`, packages, your aliases in the order given, relative.
- **Style:** 80-column lines, padding lines around returns, declarations and blocks, `eqeqeq`, `prefer-const`, `object-shorthand`.
- **Plugins:** `unicorn` and `sonarjs` recommended sets (a few noisy rules are off), `security`, `security-node`, `no-secrets`, `no-unsanitized`, `xss`, `optimize-regex` and `n` for Node.
- **Tests and scripts** (`**/test/**`, `**/scripts/**`): the `no-unsafe-*` and `no-explicit-any` rules are off, and in tests also the promise and throw rules.
- **JSON** files are linted with `eslint-plugin-json`, comments allowed.

Type-aware linting needs a `tsconfig.json` that includes your files.

## Development

```sh
npm ci
npm test            # lints fixture files with the config and asserts the rules reported
npm run typecheck   # checks index.d.ts against the tests
npm run format:check
```

Commits follow [Conventional Commits](https://www.conventionalcommits.org/); `npm run commit` opens a prompt.
