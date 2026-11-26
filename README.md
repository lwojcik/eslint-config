# @lwojcik/eslint-config

[![npm version](https://img.shields.io/npm/v/%40lwojcik%2Feslint-config)](https://www.npmjs.com/package/@lwojcik/eslint-config)
[![codecov](https://codecov.io/gh/lwojcik/eslint-config/graph/badge.svg)](https://codecov.io/gh/lwojcik/eslint-config)
[![Build status](https://ci.appveyor.com/api/projects/status/9tc4d79iibn1rmeq/branch/main?svg=true)](https://ci.appveyor.com/project/lwojcik/lwojcik-eslint-config/branch/main)

A heavily opinionated ESLint config factory for TypeScript projects, focused on enforcing functional style and security.

It supports plain TypeScript projects, plus optional configs for React, Angular (with RxJS), NestJS and TanStack Query.

## Install

Pin an exact version: a major bump of a bundled plugin (unicorn, sonarjs, ...) can add failures to your whole codebase, so it should reach you as a version change you choose.

### TypeScript project

```sh
npm install --save-dev --save-exact @lwojcik/eslint-config eslint typescript typescript-eslint
```

### React project

The TypeScript install, plus the two optional peer dependencies of the `/react` config:

```sh
npm install --save-dev --save-exact @lwojcik/eslint-config eslint typescript typescript-eslint @eslint-react/eslint-plugin eslint-plugin-jsx-a11y-x
```

### Angular project

The TypeScript install, plus the optional peer dependency of the `/angular` config:

```sh
npm install --save-dev --save-exact @lwojcik/eslint-config eslint typescript typescript-eslint angular-eslint
```

For the optional RxJS rules, also install their plugin:

```sh
npm install --save-dev --save-exact eslint-plugin-rxjs-x
```

### TanStack Query

Optional, for projects that use TanStack Query. The rules target the `use*` hooks and `queryOptions()`, so they fit React, Vue, Solid and Svelte best, and cover Angular only partly (see [TanStack Query config](#tanstack-query-config)). Add its plugin to whichever install above you use:

```sh
npm install --save-dev --save-exact @tanstack/eslint-plugin-query
```

### NestJS

Optional, for NestJS projects. Add its plugin to whichever install above you use. The plugin also expects `class-validator`, which most Nest projects already have:

```sh
npm install --save-dev --save-exact @darraghor/eslint-plugin-nestjs-typed
```

## Use

### TypeScript project

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

### React project

Add `createReactConfig` after `createConfig`:

```js
// eslint.config.js
import { createConfig } from '@lwojcik/eslint-config';
import { createReactConfig } from '@lwojcik/eslint-config/react';

export default [
  ...createConfig({ tsconfigRootDir: import.meta.dirname }),
  ...createReactConfig({ tsconfigRootDir: import.meta.dirname }),
];
```

Your `tsconfig.json` must include the `.tsx` files and set `jsx`. See [React config](#react-config) for what it adds.

### Angular project

Add `createAngularConfig` after `createConfig`:

```js
// eslint.config.js
import { createConfig } from '@lwojcik/eslint-config';
import { createAngularConfig } from '@lwojcik/eslint-config/angular';

export default [
  ...createConfig({ tsconfigRootDir: import.meta.dirname }),
  ...createAngularConfig({ selectorPrefix: 'app' }),
];
```

See [Angular config](#angular-config) for what it adds.

To lint RxJS code as well, add `createRxjsConfig` from the `/angular/rxjs` subpath. It works in any project that uses RxJS:

```js
import { createRxjsConfig } from '@lwojcik/eslint-config/angular/rxjs';

export default [
  ...createConfig({ tsconfigRootDir: import.meta.dirname }),
  ...createAngularConfig({ selectorPrefix: 'app' }),
  ...createRxjsConfig(),
];
```

### TanStack Query

Add `createTanstackQueryConfig` from the `/tanstack-query` subpath to any of the setups above:

```js
import { createTanstackQueryConfig } from '@lwojcik/eslint-config/tanstack-query';

export default [
  ...createConfig({ tsconfigRootDir: import.meta.dirname }),
  ...createReactConfig({ tsconfigRootDir: import.meta.dirname }),
  ...createTanstackQueryConfig(),
];
```

### NestJS

Add `createNestjsConfig` from the `/nestjs` subpath to the TypeScript setup:

```js
import { createNestjsConfig } from '@lwojcik/eslint-config/nestjs';

export default [
  ...createConfig({ tsconfigRootDir: import.meta.dirname }),
  ...createNestjsConfig({ swagger: true }),
];
```

## Options

| Option            | Type                               | Default      | Meaning                                                                                                                                                                   |
| ----------------- | ---------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsconfigRootDir` | `string`                           | required     | Directory of your `tsconfig.json`, for type-aware linting. Pass `import.meta.dirname`.                                                                                    |
| `importAliases`   | `string[]`                         | `[]`         | Path aliases such as `@app` or `@` (no trailing `/`; regex characters are escaped), each sorted into its own import group after the packages and before relative imports. |
| `ignores`         | `string[]`                         | `[]`         | Globs to ignore, besides `**/coverage/` and `**/dist/`.                                                                                                                   |
| `untypedFiles`    | `string[]`                         | `[]`         | TypeScript files outside your tsconfig; type-aware rules are switched off for them.                                                                                       |
| `nodeVersion`     | `string`                           | `'>=24.0.0'` | The Node range `eslint-plugin-n` checks against.                                                                                                                          |
| `processEnv`      | `{ message, allowedIn: string[] }` | off          | Bans `process.env` in `src/` with your message, except in the `allowedIn` globs (for example where you inject the environment).                                           |
| `overrides`       | `Linter.Config[]`                  | `[]`         | Extra flat-config objects, appended last.                                                                                                                                 |

## What it enforces

Rules apply to `**/src/**/*.{ts,tsx}` unless noted.

- **Base:** `@eslint/js` recommended and typescript-eslint's type-checked recommended set, with unused disable directives reported as errors.
- **Functional style:** loops and `let` are banned (use `map`, `filter`, `reduce`, `const`), and `functional/immutable-data` forbids mutating existing values. A variable named `draft…` is exempt, for immer drafts.
- **Size limits:** at most 2 parameters per function, 20 statements, 50 lines per function, 250 lines per file, nesting depth 4, complexity 10, one class per file, no magic numbers (except in `src/config.ts`), identifiers of at least 2 characters.
- **No comments:** every comment is an error except `eslint` and `global` directives (all files, including tests). This includes JSX comments such as `{/* note */}`.
- **Imports:** sorted with `simple-import-sort`, in the groups: side effects, `node:`, packages, your aliases in the order given, relative.
- **Style:** 80-column lines, padding lines around returns, declarations and blocks, `eqeqeq`, `prefer-const`, `object-shorthand`.
- **Plugins:** `unicorn` and `sonarjs` recommended sets (a few noisy rules are off), `security`, `security-node`, `no-secrets`, `no-unsanitized`, `optimize-regex` and `n` for Node. `xss/no-location-href-assign` is a rule built into this package, because `eslint-plugin-xss` has not been updated since 2022 and crashes on ESLint 10.
- **Tests and scripts** (`**/test/**`, `**/*.spec.*`, `**/*.test.*`, `**/scripts/**`): the `no-unsafe-*` and `no-explicit-any` rules are off, and in tests also the promise and throw rules. In colocated `*.spec.*` and `*.test.*` files, the magic-number, `max-lines`, `max-lines-per-function` and `max-statements` rules are off too.
- **JSON** files are linted with `eslint-plugin-json`, comments allowed.

Type-aware linting needs a `tsconfig.json` that includes your files.

## React config

Only for React projects: `createReactConfig` applies to `**/*.tsx` and takes `tsconfigRootDir` (required) and `overrides` (`Linter.Config[]`, appended last). It does not change the TypeScript-only setup.

- **React rules:** the `strict-type-checked` preset of `@eslint-react/eslint-plugin`, with every warning raised to an error. It covers hooks, purity, keys, leaked conditional rendering, and unsafe DOM APIs such as `dangerouslySetInnerHTML`. `eslint-plugin-react-hooks` is not needed, because this preset replaces its rules.
- **Accessibility:** the `strict` preset of `eslint-plugin-jsx-a11y-x`, a fork of `eslint-plugin-jsx-a11y` that supports ESLint 10.
- **Base rules:** the base config also applies to `.tsx` files in `src/`. `max-lines-per-function` is 100 for `.tsx` files (50 for `.ts`), because JSX markup inflates component bodies. `unicorn/name-replacements` allows `props` and `ref`, since they are React API names.

Both plugins are optional peer dependencies: a TypeScript-only project does not need them.

## Angular config

Only for Angular projects. `createAngularConfig` needs no `tsconfigRootDir`, because the base config already handles TypeScript parsing. It takes optional options:

| Option           | Type              | Default | Meaning                                                                                                                      |
| ---------------- | ----------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `selectorPrefix` | `string`          | off     | Enforces your prefix: kebab-case component selectors, camelCase directive selectors and pipe names starting with the prefix. |
| `overrides`      | `Linter.Config[]` | `[]`    | Extra flat-config objects, appended last.                                                                                    |

- **TypeScript files:** the `recommended` preset of `angular-eslint`, plus rules for signals (`prefer-signals`, `prefer-signal-model`, `no-uncalled-signals`, `computed-must-return`), `inject-at-top`, output and lifecycle hygiene, and `no-forward-ref`. Inline templates are linted too.
- **Templates (`*.html`):** the `recommended` and `accessibility` presets, plus `button-has-type`, `no-any`, `no-non-null-assertion`, `no-inline-styles`, `prefer-class-binding`, `prefer-style-binding` and a few more.
- **Severity:** every warning is raised to an error.
- **Type-aware rules** from the base config are switched off for templates, which the template parser cannot type-check.

`angular-eslint` is an optional peer dependency: a TypeScript-only or React project does not need it. Its major version follows Angular's.

## RxJS config

Optional, and independent of the Angular config. `createRxjsConfig` applies the `strict` preset of `eslint-plugin-rxjs-x` to `**/*.ts`, with every rule an error. It catches nested `subscribe`, `subscribe` without an error handler, floating observables, exposed subjects, async `subscribe` callbacks and misused `takeUntil`. It does not enforce Finnish notation.

| Option         | Type              | Default | Meaning                                                                                          |
| -------------- | ----------------- | ------- | ------------------------------------------------------------------------------------------------ |
| `untypedFiles` | `string[]`        | `[]`    | The same globs you pass to `createConfig`. These rules need type information, so they skip them. |
| `overrides`    | `Linter.Config[]` | `[]`    | Extra flat-config objects, appended last.                                                        |

The plugin needs `rxjs` 7 and TypeScript below 6.1.

## TanStack Query config

Optional, and independent of the React and Angular configs. `createTanstackQueryConfig` applies the `flat/recommended-strict` preset of `@tanstack/eslint-plugin-query` to `**/*.{ts,tsx}`, with every warning raised to an error. It takes one option, `overrides` (`Linter.Config[]`, appended last).

- **Correctness:** `exhaustive-deps` (query keys must include every variable the query function uses), `stable-query-client`, `no-unstable-deps`, `no-void-query-fn` and `no-rest-destructuring`.
- **Angular:** the rules recognise the `use*` hooks and `queryOptions()`, but not `injectQuery`, `injectMutation` or `injectInfiniteQuery`. Define your options with `queryOptions()` and pass them in, as in `injectQuery(() => todoOptions(this.id()))`, so `exhaustive-deps` and `no-void-query-fn` can check them. Options written inline inside `injectQuery(() => ({ ... }))` are not checked.
- **Conventions:** `infinite-query-property-order`, `mutation-property-order` and `prefer-query-options`, which asks you to define queries with `queryOptions()` instead of inline objects.

## NestJS config

Optional, and independent of the other framework configs. `createNestjsConfig` applies the recommended preset of `@darraghor/eslint-plugin-nestjs-typed` to `**/*.ts`.

| Option        | Type              | Default           | Meaning                                                                                                                     |
| ------------- | ----------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `swagger`     | `boolean`         | `false`           | Keeps the `@nestjs/swagger` rules (`controllers-should-supply-api-tags`, `api-method-should-specify-api-response`, ...) on. |
| `sourceGlobs` | `string[]`        | `['src/**/*.ts']` | Where `injectable-should-be-provided` looks for modules, relative to the directory ESLint runs from. Set it in a monorepo.  |
| `overrides`   | `Linter.Config[]` | `[]`              | Extra flat-config objects, appended last.                                                                                   |

- **Dependency injection:** `injectable-should-be-provided` (a service or controller no module registers fails at startup), `provided-injected-should-match-factory-parameters`, `use-injectable-provided-token` and `forward-ref-injection-should-use-wrapper-type`.
- **Validation and security:** `validation-pipe-should-use-forbid-unknown`, `all-properties-are-whitelisted`, `all-properties-have-explicit-defined`, `validated-non-primitive-property-needs-type-decorator`, `validate-nested-of-array-should-set-each` and `uploaded-file-should-be-validated`.
- **Routes and decorators:** `param-decorator-name-matches-route-param` and `no-duplicate-decorators`.
- **Constructors:** `max-params` is 5 instead of 2 in files named `*.consumer.ts`, `*.controller.ts`, `*.filter.ts`, `*.gateway.ts`, `*.guard.ts`, `*.handler.ts`, `*.interceptor.ts`, `*.middleware.ts`, `*.pipe.ts`, `*.processor.ts`, `*.provider.ts`, `*.repository.ts`, `*.resolver.ts`, `*.service.ts` and `*.strategy.ts`, because injected services count as parameters.
- **Module scan:** `injectable-should-be-provided` skips paths matching `node_modules`, `.test.` and `.spec.`. The plugin's own default builds these as regular expressions without escaping the dots, so `.test.` also matches `/test/` and `/latest/`; this config escapes them.

The plugin needs TypeScript below 6.1 and the `class-validator` package.

## Using with AI agents

[llms.txt](llms.txt) ships in the package (`node_modules/@lwojcik/eslint-config/llms.txt`). It gives coding agents the setup, the rules that surprise people (no comments, no loops, no mutation) and how to satisfy them. Options carry JSDoc in the `.d.ts` files. To make agents in your project follow it, add a line to your `AGENTS.md` or `CLAUDE.md`:

```md
Lint rules come from @lwojcik/eslint-config. Read node_modules/@lwojcik/eslint-config/llms.txt before writing code, and run `npx eslint --fix` after.
```

## Development

```sh
npm ci
npm test            # lints fixture files with the config and asserts the rules reported
npm run typecheck   # checks index.d.ts against the tests
npm run format:check
```
