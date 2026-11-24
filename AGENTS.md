# AGENTS.md

`@lwojcik/eslint-config`: ESLint 10 flat-config factories (ESM, plain JavaScript with hand-written `.d.ts`). Consumer-facing guidance is in `llms.txt`; options are documented in `README.md`.

## Layout

- `index.js`: base `createConfig`. `react.js`, `angular.js`, `angular-rxjs.js`, `tanstack-query.js`, `nestjs.js`: framework configs, each exported as a subpath in `package.json`.
- `*.d.ts`: public types, one per entry point. Keep them in sync with the options each factory destructures.
- `xss-plugin.js`: local rule, because `eslint-plugin-xss` crashes on ESLint 10.
- `test/`: Vitest. Tests lint files in `test/fixtures/` with the real config and assert which rules reported.

## Commands

- `npm test`: run all tests. `npm run typecheck`: checks the `.d.ts` files against the tests. `npm run format:check`: Prettier.
- Run all three before finishing a change.

## Conventions

- This package enforces a no-comments policy and a functional style on itself in spirit: no code comments in `.js`/`.ts` files, no loops, no `let`.
- Adding a rule or option: update the factory, its `.d.ts` (with JSDoc, which is allowed in `.d.ts`), a fixture plus test, `README.md` and `llms.txt`.
- Adding an entry point: add it to `exports` and `files` in `package.json`. `test/package.test.ts` fails if a target is missing or not shipped.
- Framework plugins are optional peer dependencies and also devDependencies (pinned exactly). Keep both in sync.
- Commits follow Conventional Commits (commitlint runs in a husky hook); PR titles are checked too. Use `npm run commit` for the prompt. Do not run `npm run release`.
