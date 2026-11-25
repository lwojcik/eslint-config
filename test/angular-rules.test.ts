import { resolve } from 'node:path';

import { ESLint, type Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { createAngularConfig } from '../angular.js';
import { createConfig } from '../index.js';
import { FIXTURES } from './lint.js';

const eslint = new ESLint({
  cwd: FIXTURES,
  overrideConfigFile: true,
  overrideConfig: [
    ...createConfig({ tsconfigRootDir: FIXTURES }),
    ...createAngularConfig(),
  ] as Linter.Config[],
});

const lintFile = async (code: string, file: string) => {
  const [result] = await eslint.lintText(code, {
    filePath: resolve(FIXTURES, file),
  });

  return result.messages.map((message) => message.ruleId);
};

const component = (imports: string, body: string): string =>
  `import { ChangeDetectionStrategy, Component, ${imports} } from '@angular/core';\n\n@Component({ selector: 'app-x', template: '', changeDetection: ChangeDetectionStrategy.OnPush })\nexport class XComponent {\n${body}\n}\n`;
const TS_CASES: Record<string, string> = {
  'computed-must-return': component(
    'computed',
    `  readonly value = computed(() => {\n    String(1);\n  });`,
  ),
  'inject-at-top': component(
    'ElementRef, inject, input',
    `  readonly label = input.required<string>();\n  private readonly host = inject(ElementRef);`,
  ),
  'no-async-lifecycle-method': component(
    'type OnInit',
    `  async ngOnInit(): Promise<void> {\n    await Promise.resolve();\n  }`,
  ).replace('class XComponent', 'class XComponent implements OnInit'),
  'no-attribute-decorator': component(
    'Attribute',
    `  constructor(@Attribute('kind') readonly kind: string) {}`,
  ),
  'no-duplicates-in-metadata-arrays': `import { ChangeDetectionStrategy, Component, Directive } from '@angular/core';\n\n@Directive({ selector: '[appA]' })\nexport class ADirective {}\n\n@Component({ selector: 'app-x', template: '', changeDetection: ChangeDetectionStrategy.OnPush, imports: [ADirective, ADirective] })\nexport class XComponent {}\n`,
  'no-forward-ref': component(
    'forwardRef, inject, Injectable',
    `  readonly service = inject(forwardRef(() => XService));\n}\n\n@Injectable({ providedIn: 'root' })\nexport class XService {`,
  ),
  'no-global-document': `import { ChangeDetectionStrategy, Component } from '@angular/core';\n\n@Component({ selector: 'app-x', template: '', changeDetection: ChangeDetectionStrategy.OnPush })\nexport class XComponent {\n  readonly title = document.title;\n}\n`,
  'no-implicit-take-until-destroyed': `import { of } from 'rxjs';\nimport { takeUntilDestroyed } from '@angular/core/rxjs-interop';\n\nexport const stream = (): void => {\n  of(1).pipe(takeUntilDestroyed()).subscribe();\n};\n`,
  'no-lifecycle-call': component(
    'type OnInit',
    `  ngOnInit(): void {\n    String(1);\n  }\n\n  reset(): void {\n    this.ngOnInit();\n  }`,
  ).replace('class XComponent', 'class XComponent implements OnInit'),
  'no-pipe-impure': `import { Pipe, type PipeTransform } from '@angular/core';\n\n@Pipe({ name: 'x', pure: false })\nexport class XPipe implements PipeTransform {\n  transform(value: string): string {\n    return value;\n  }\n}\n`,
  'no-queries-metadata-property': `import { ChangeDetectionStrategy, Component } from '@angular/core';\n\n@Component({ selector: 'app-x', template: '', changeDetection: ChangeDetectionStrategy.OnPush, queries: {} })\nexport class XComponent {}\n`,
  'no-uncalled-signals': component(
    'signal',
    `  readonly count = signal(0);\n\n  check(): boolean {\n    return this.count ? true : false;\n  }`,
  ),
  'prefer-host-metadata-property': component(
    'HostBinding',
    `  @HostBinding('class.active') readonly active = true;`,
  ),
  'prefer-output-emitter-ref': component(
    'EventEmitter, Output',
    `  @Output() readonly changed = new EventEmitter<number>();`,
  ),
  'prefer-output-readonly': component(
    'output',
    `  changed = output<number>();`,
  ),
  'prefer-signal-model': component(
    'input, output',
    `  readonly value = input.required<number>();\n  readonly valueChange = output<number>();`,
  ),
  'prefer-signals': component('Input', `  @Input() name = '';`),
  'reactive-context-must-read-signal': component(
    'computed',
    `  readonly value = computed(() => 5);`,
  ),
};
const TEMPLATE_CASES: Record<string, string> = {
  'button-has-type': `<button>Go</button>\n`,
  'no-any': `<p>{{ $any(value) }}</p>\n`,
  'no-duplicate-attributes': `<input id="a" id="b" />\n`,
  'no-empty-control-flow': `@if (ready()) {\n}\n`,
  'no-inline-styles': `<p style="color: red">x</p>\n`,
  'no-interpolation-in-attributes': `<p title="{{ label() }}">x</p>\n`,
  'no-non-null-assertion': `<p>{{ value()! }}</p>\n`,
  'no-positive-tabindex': `<div tabindex="2"></div>\n`,
  'prefer-class-binding': `<p [ngClass]="{ active: on() }">x</p>\n`,
  'prefer-contextual-for-variables': `@for (item of items(); track item; let i = $index) {\n  @if (i === 0) {\n    <p>first</p>\n  }\n}\n`,
  'prefer-self-closing-tags': `<app-x></app-x>\n`,
  'prefer-style-binding': `<p [ngStyle]="{ color: 'red' }">x</p>\n`,
  'require-switch-default': `@switch (kind()) {\n  @case ('a') {\n    <p>a</p>\n  }\n}\n`,
};

describe('custom typescript rules', () => {
  it.each(Object.entries(TS_CASES))('reports %s', async (name, code) => {
    expect(await lintFile(code, 'src/app.component.ts')).toContain(
      `@angular-eslint/${name}`,
    );
  });
});

describe('custom template rules', () => {
  it.each(Object.entries(TEMPLATE_CASES))('reports %s', async (name, code) => {
    expect(await lintFile(code, 'src/app.component.html')).toContain(
      `@angular-eslint/template/${name}`,
    );
  });
});
