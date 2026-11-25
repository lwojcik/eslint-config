import { resolve } from 'node:path';

import { ESLint, type Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { createAngularConfig } from '../angular.js';
import { createConfig } from '../index.js';
import { FIXTURES } from './lint.js';

const TS_FILE = 'src/app.component.ts';
const HTML_FILE = 'src/app.component.html';

const createEslint = (options: Parameters<typeof createAngularConfig>[0]) =>
  new ESLint({
    cwd: FIXTURES,
    overrideConfigFile: true,
    overrideConfig: [
      ...createConfig({ tsconfigRootDir: FIXTURES }),
      ...createAngularConfig(options),
    ] as Linter.Config[],
  });

const lintAngular = async (
  code: string,
  file = TS_FILE,
  options?: Parameters<typeof createAngularConfig>[0],
) => {
  const [result] = await createEslint(options).lintText(code, {
    filePath: resolve(FIXTURES, file),
  });

  return result.messages.map((message) => message.ruleId ?? message.message);
};

const CLEAN_COMPONENT = `import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-counter',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CounterComponent {
  private readonly host = inject(ElementRef);
  readonly label = input.required<string>();
  readonly changed = output<number>();
  readonly count = signal(0);
  readonly double = computed(() => this.count() * 2);

  increment(): void {
    this.count.update((value) => value + 1);
    this.changed.emit(this.count());
  }
}
`;

const CLEAN_TEMPLATE = `@if (items().length) {
  <ul>
    @for (item of items(); track item.id) {
      <li>{{ item.name }}</li>
    }
  </ul>
}
<button type="button" (click)="go()" (keydown.enter)="go()">Go</button>
`;

describe('a realistic component', () => {
  it('lints clean', async () => {
    expect(
      await lintAngular(CLEAN_COMPONENT, TS_FILE, { selectorPrefix: 'app' }),
    ).toEqual([]);
  });

  it('flags legacy decorators and empty lifecycle methods', async () => {
    const messages = await lintAngular(
      `import { Component, Input, type OnInit } from '@angular/core';\n\n@Component({ selector: 'app-x', template: '' })\nexport class XComponent implements OnInit {\n  @Input() name = '';\n\n  ngOnInit(): void {}\n}\n`,
    );

    expect(messages).toContain('@angular-eslint/prefer-signals');
    expect(messages).toContain('@angular-eslint/no-empty-lifecycle-method');
  });

  it('applies the base rules', async () => {
    const messages = await lintAngular(
      CLEAN_COMPONENT.replace('signal(0)', 'signal(4242)'),
    );

    expect(messages).toContain('no-magic-numbers');
  });
});

describe('other Angular code', () => {
  it('lints a service using takeUntilDestroyed clean', async () => {
    expect(
      await lintAngular(
        `import { DestroyRef, inject, Injectable, signal } from '@angular/core';\nimport { takeUntilDestroyed } from '@angular/core/rxjs-interop';\nimport { type Observable } from 'rxjs';\n\n@Injectable({ providedIn: 'root' })\nexport class TickService {\n  private readonly cleanup = inject(DestroyRef);\n  readonly failure = signal('');\n  readonly ticks = signal(0);\n\n  start(source: Observable<number>): void {\n    source.pipe(takeUntilDestroyed(this.cleanup)).subscribe({\n      error: (reason: unknown) => this.failure.set(String(reason)),\n      next: (value) => this.ticks.set(value),\n    });\n  }\n}\n`,
      ),
    ).toEqual([]);
  });

  it('lints a functional guard and routes clean', async () => {
    expect(
      await lintAngular(
        `import { inject } from '@angular/core';\nimport { type CanActivateFn, Router, type Routes } from '@angular/router';\n\nexport const authGuard: CanActivateFn = () =>\n  inject(Router).createUrlTree(['/login']);\n\nexport const routes: Routes = [\n  { canActivate: [authGuard], children: [], path: '' },\n];\n`,
        'src/app.routes.ts',
      ),
    ).toEqual([]);
  });

  it('lints a colocated spec file clean', async () => {
    expect(
      await lintAngular(
        `import { TestBed } from '@angular/core/testing';\nimport { describe, expect, it } from 'vitest';\n\nimport { CounterComponent } from './app.component';\n\ndescribe('CounterComponent', () => {\n  it('counts', () => {\n    const fixture = TestBed.createComponent(CounterComponent);\n\n    fixture.componentInstance.increment();\n\n    expect(fixture.componentInstance.count()).toBe(1);\n  });\n});\n`,
        'src/app.component.spec.ts',
      ),
    ).toEqual([]);
  });

  it('lints a template with defer, let, i18n and bindings clean', async () => {
    expect(
      await lintAngular(
        `<label for="name">Name</label>\n<input id="name" [value]="name()" (input)="rename($event)" />\n@defer (on viewport) {\n  <app-heavy [data]="data$ | async" />\n} @placeholder {\n  <p i18n>Loading</p>\n}\n@let total = items().length;\n<p [class.active]="active()" [attr.aria-label]="label()">{{ total }}</p>\n<a [routerLink]="['/x']" i18n-title title="Go">Go</a>\n`,
        HTML_FILE,
      ),
    ).toEqual([]);
  });
});

describe('selectorPrefix', () => {
  const wrongPrefix = CLEAN_COMPONENT.replace('app-counter', 'foo-counter');

  it('is not enforced when the option is not set', async () => {
    expect(await lintAngular(wrongPrefix)).not.toContain(
      '@angular-eslint/component-selector',
    );
  });

  it('is enforced for components when the option is set', async () => {
    expect(
      await lintAngular(wrongPrefix, TS_FILE, { selectorPrefix: 'app' }),
    ).toContain('@angular-eslint/component-selector');
  });

  it('is enforced for directives and pipes', async () => {
    const messages = await lintAngular(
      `import { Directive, Pipe, type PipeTransform } from '@angular/core';\n\n@Directive({ selector: '[other]' })\nexport class OtherDirective {}\n\n@Pipe({ name: 'other' })\nexport class OtherPipe implements PipeTransform {\n  transform(value: string): string {\n    return value;\n  }\n}\n`,
      TS_FILE,
      { selectorPrefix: 'app' },
    );

    expect(messages).toContain('@angular-eslint/directive-selector');
    expect(messages).toContain('@angular-eslint/pipe-prefix');
  });
});

describe('templates', () => {
  it('lints a clean template without errors', async () => {
    expect(await lintAngular(CLEAN_TEMPLATE, HTML_FILE)).toEqual([]);
  });

  it('reports template and accessibility problems', async () => {
    const messages = await lintAngular(
      `<div *ngIf="first == second" (click)="go()"><img src="x.png"><button>Go</button></div>\n`,
      HTML_FILE,
    );

    expect(messages).toEqual(
      expect.arrayContaining([
        '@angular-eslint/template/prefer-control-flow',
        '@angular-eslint/template/eqeqeq',
        '@angular-eslint/template/alt-text',
        '@angular-eslint/template/click-events-have-key-events',
        '@angular-eslint/template/button-has-type',
      ]),
    );
  });

  it('lints inline templates', async () => {
    const messages = await lintAngular(
      `import { Component } from '@angular/core';\n\n@Component({ selector: 'app-x', template: '<img src="x.png">' })\nexport class XComponent {}\n`,
    );

    expect(messages).toContain('@angular-eslint/template/alt-text');
  });
});

describe('severity', () => {
  it('leaves no angular rule at warning level', async () => {
    const eslint = createEslint({ selectorPrefix: 'app' });
    const levels = (
      await Promise.all(
        [TS_FILE, HTML_FILE].map((file) =>
          eslint.calculateConfigForFile(resolve(FIXTURES, file)),
        ),
      )
    ).flatMap((config) =>
      Object.entries(config?.rules ?? {})
        .filter(([name]) => name.startsWith('@angular-eslint/'))
        .map(([, value]) => (Array.isArray(value) ? value[0] : value)),
    );

    expect(levels.length).toBeGreaterThan(40);
    expect(levels).not.toContain(1);
    expect(levels).not.toContain('warn');
  });
});

describe('overrides', () => {
  it('come last', () => {
    const override = { rules: { 'no-console': 'off' } } as Linter.Config;

    expect(createAngularConfig({ overrides: [override] }).at(-1)).toMatchObject(
      override,
    );
  });
});

describe('package export', () => {
  it('resolves the /angular subpath', async () => {
    const exported = await import('@lwojcik/eslint-config/angular');

    expect(exported.createAngularConfig).toBe(createAngularConfig);
  });
});
