import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ESLint, type Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { createConfig } from '../index.js';
import { createNestjsConfig } from '../nestjs.js';
import { FIXTURES } from './lint.js';

type NestjsOptions = Parameters<typeof createNestjsConfig>[0];

const RULE = '@darraghor/nestjs-typed';
const PROVIDED = `${RULE}/injectable-should-be-provided`;
const CONTROLLER = 'src/cats.controller.ts';
const DTO = 'src/create-cat.dto.ts';
const SERVICE = 'src/cats.service.ts';
const FACADE = 'src/facade.service.ts';
const SOURCE_GLOBS = [`${FIXTURES}/src/**/*.ts`];

const createEslint = (options?: NestjsOptions) =>
  new ESLint({
    cwd: FIXTURES,
    overrideConfigFile: true,
    overrideConfig: [
      ...createConfig({ tsconfigRootDir: FIXTURES }),
      ...createNestjsConfig({ sourceGlobs: SOURCE_GLOBS, ...options }),
    ],
  });

const eslint = createEslint();
const swaggerEslint = createEslint({ swagger: true });

const lintFile = async (code: string, file: string, instance = eslint) => {
  const [result] = await instance.lintText(code, {
    filePath: resolve(FIXTURES, file),
  });

  return result.messages.map((message) => message.ruleId ?? message.message);
};

const fixture = (file: string) => readFileSync(resolve(FIXTURES, file), 'utf8');

const ruleOptions = async (file: string, rule: string, instance = eslint) => {
  const config = await instance.calculateConfigForFile(resolve(FIXTURES, file));

  return config?.rules?.[rule];
};

const levelOf = (value: unknown) => (Array.isArray(value) ? value[0] : value);

const controller = (imports: string, body: string) =>
  `import { Controller, Get, Post, UploadedFile, UseInterceptors } from '@nestjs/common';\n${imports}\n@Controller('cats')\nexport class CatsController {\n${body}\n}\n`;

const CLEAN_FILES: [string, string, string][] = [
  ['a module', 'src/cats.module.ts', fixture('src/cats.module.ts')],
  ['a controller', CONTROLLER, fixture(CONTROLLER)],
  ['a service', SERVICE, fixture(SERVICE)],
  ['a DTO', DTO, fixture(DTO)],
  [
    'a guard with a reflector',
    'src/auth.guard.ts',
    `import {\n  type CanActivate,\n  type ExecutionContext,\n  Injectable,\n} from '@nestjs/common';\nimport { Reflector } from '@nestjs/core';\n\n@Injectable()\nexport class AuthGuard implements CanActivate {\n  constructor(private readonly reflector: Reflector) {}\n\n  canActivate(context: ExecutionContext): boolean {\n    return this.reflector.get<boolean>('public', context.getHandler());\n  }\n}\n`,
  ],
  [
    'an interceptor',
    'src/logging.interceptor.ts',
    `import {\n  type CallHandler,\n  type ExecutionContext,\n  Injectable,\n  type NestInterceptor,\n} from '@nestjs/common';\nimport { map, type Observable } from 'rxjs';\n\n@Injectable()\nexport class LoggingInterceptor implements NestInterceptor {\n  intercept(\n    _context: ExecutionContext,\n    next: CallHandler<string>,\n  ): Observable<{ data: string }> {\n    return next.handle().pipe(map((data) => ({ data })));\n  }\n}\n`,
  ],
  [
    'an exception filter',
    'src/http-exception.filter.ts',
    `import {\n  type ArgumentsHost,\n  Catch,\n  type ExceptionFilter,\n  HttpException,\n} from '@nestjs/common';\n\ninterface Reply {\n  status: (code: number) => void;\n}\n\n@Catch(HttpException)\nexport class HttpExceptionFilter implements ExceptionFilter {\n  catch(exception: HttpException, host: ArgumentsHost): void {\n    host.switchToHttp().getResponse<Reply>().status(exception.getStatus());\n  }\n}\n`,
  ],
  [
    'a pipe',
    'src/parse-cat.pipe.ts',
    `import { Injectable, type PipeTransform } from '@nestjs/common';\n\n@Injectable()\nexport class ParseCatPipe implements PipeTransform<string, string> {\n  transform(value: string): string {\n    return value.trim();\n  }\n}\n`,
  ],
  [
    'a module with a factory provider',
    'src/factory.module.ts',
    `import { Module } from '@nestjs/common';\n\nexport const DATABASE = Symbol('DATABASE');\n\n@Module({\n  providers: [\n    {\n      inject: ['CONFIG'],\n      provide: DATABASE,\n      useFactory: (config: string): string => config,\n    },\n  ],\n})\nexport class FactoryModule {}\n`,
  ],
  [
    'a colocated spec file',
    'src/cats.service.spec.ts',
    `import { Test } from '@nestjs/testing';\nimport { describe, expect, it } from 'vitest';\n\nimport { CatsService } from './cats.service.js';\n\ndescribe('CatsService', () => {\n  it('lists cats', async () => {\n    const module = await Test.createTestingModule({\n      providers: [CatsService],\n    }).compile();\n\n    expect(module.get(CatsService).findAll()).toEqual(['Tom']);\n  });\n});\n`,
  ],
];

const SWAGGER_CLEAN: [string, string, string][] = [
  [
    'a documented controller',
    CONTROLLER,
    `import { Controller, Get } from '@nestjs/common';\nimport { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';\n\nimport { CatsService } from './cats.service.js';\n\n@ApiTags('cats')\n@Controller('cats')\nexport class CatsController {\n  constructor(private readonly catsService: CatsService) {}\n\n  @Get()\n  @ApiOperation({ summary: 'List cats' })\n  @ApiOkResponse({ type: [String] })\n  findAll(): string[] {\n    return this.catsService.findAll();\n  }\n}\n`,
  ],
  [
    'a documented DTO',
    DTO,
    `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';\nimport { IsInt, IsOptional, IsString } from 'class-validator';\n\nexport class CreateCatDto {\n  @ApiProperty()\n  @IsString()\n  readonly name!: string;\n\n  @ApiPropertyOptional()\n  @IsInt()\n  @IsOptional()\n  readonly age?: number;\n\n  @ApiProperty({ isArray: true, type: String })\n  @IsString({ each: true })\n  readonly tags!: string[];\n}\n`,
  ],
];

const FIRING_CASES: [string, string, string][] = [
  [
    'injectable-should-be-provided',
    'src/orphan.service.ts',
    `import { Injectable } from '@nestjs/common';\n\n@Injectable()\nexport class OrphanService {}\n`,
  ],
  [
    'provided-injected-should-match-factory-parameters',
    'src/factory.module.ts',
    `import { Module } from '@nestjs/common';\n\n@Module({\n  providers: [\n    {\n      inject: ['A'],\n      provide: 'X',\n      useFactory: (first: string, second: string) => first + second,\n    },\n  ],\n})\nexport class FactoryModule {}\n`,
  ],
  [
    'use-injectable-provided-token',
    FACADE,
    `import { Inject, Injectable } from '@nestjs/common';\nimport { APP_GUARD } from '@nestjs/core';\n\n@Injectable()\nexport class Facade {\n  constructor(@Inject(APP_GUARD) private readonly guard: string) {}\n}\n`,
  ],
  [
    'forward-ref-injection-should-use-wrapper-type',
    FACADE,
    `import { forwardRef, Inject, Injectable } from '@nestjs/common';\n\nimport { CatsService } from './cats.service.js';\n\n@Injectable()\nexport class Facade {\n  constructor(\n    @Inject(forwardRef(() => CatsService)) private readonly cats: CatsService,\n  ) {}\n}\n`,
  ],
  [
    'validation-pipe-should-use-forbid-unknown',
    'src/pipes.ts',
    `import { ValidationPipe } from '@nestjs/common';\n\nexport const pipe = new ValidationPipe({ whitelist: true });\n`,
  ],
  [
    'param-decorator-name-matches-route-param',
    CONTROLLER,
    `import { Controller, Get, Param } from '@nestjs/common';\n\n@Controller('cats')\nexport class CatsController {\n  @Get(':id')\n  find(@Param('identifier') id: string): string {\n    return id;\n  }\n}\n`,
  ],
  [
    'validated-non-primitive-property-needs-type-decorator',
    DTO,
    `import { IsDefined, ValidateNested } from 'class-validator';\n\nexport class Inner {}\n\nexport class Outer {\n  @IsDefined()\n  @ValidateNested()\n  readonly inner!: Inner;\n}\n`,
  ],
  [
    'validate-nested-of-array-should-set-each',
    DTO,
    `import { Type } from 'class-transformer';\nimport { IsDefined, ValidateNested } from 'class-validator';\n\nexport class Inner {}\n\nexport class Outer {\n  @IsDefined()\n  @Type(() => Inner)\n  @ValidateNested()\n  readonly inners!: Inner[];\n}\n`,
  ],
  [
    'all-properties-are-whitelisted',
    DTO,
    `import { IsString } from 'class-validator';\n\nexport class CreateCatDto {\n  @IsString()\n  readonly name!: string;\n\n  readonly age!: number;\n}\n`,
  ],
  [
    'all-properties-have-explicit-defined',
    DTO,
    `import { IsString } from 'class-validator';\n\nexport class CreateCatDto {\n  @IsString()\n  readonly name?: string;\n}\n`,
  ],
  [
    'no-duplicate-decorators',
    SERVICE,
    `import { Injectable } from '@nestjs/common';\n\n@Injectable()\n@Injectable()\nexport class CatsService {}\n`,
  ],
  [
    'uploaded-file-should-be-validated',
    CONTROLLER,
    controller(
      '',
      `  @Post()\n  upload(@UploadedFile() file: unknown): unknown {\n    return file;\n  }`,
    ),
  ],
];

const SWAGGER_CASES: [string, string, string][] = [
  [
    'controllers-should-supply-api-tags',
    CONTROLLER,
    controller('', `  @Get()\n  findAll(): string[] {\n    return [];\n  }`),
  ],
  [
    'api-method-should-specify-api-response',
    CONTROLLER,
    controller('', `  @Get()\n  findAll(): string[] {\n    return [];\n  }`),
  ],
  [
    'api-property-matches-property-optionality',
    DTO,
    `import { ApiProperty } from '@nestjs/swagger';\nimport { IsOptional, IsString } from 'class-validator';\n\nexport class CreateCatDto {\n  @ApiProperty()\n  @IsOptional()\n  @IsString()\n  readonly name?: string;\n}\n`,
  ],
  [
    'api-enum-property-best-practices',
    DTO,
    `import { ApiProperty } from '@nestjs/swagger';\nimport { IsEnum } from 'class-validator';\n\nexport enum Color {\n  Red = 'red',\n}\n\nexport class CreateCatDto {\n  @ApiProperty({ enum: Color })\n  @IsEnum(Color)\n  readonly color!: Color;\n}\n`,
  ],
  [
    'api-property-returning-array-should-set-array',
    DTO,
    `import { ApiProperty } from '@nestjs/swagger';\nimport { IsString } from 'class-validator';\n\nexport class CreateCatDto {\n  @ApiProperty()\n  @IsString({ each: true })\n  readonly names!: string[];\n}\n`,
  ],
  [
    'swagger-file-upload-should-be-documented',
    CONTROLLER,
    controller(
      `import { FileInterceptor } from '@nestjs/platform-express';\n`,
      `  @Post()\n  @UseInterceptors(FileInterceptor('file'))\n  upload(@UploadedFile() file: unknown): unknown {\n    return file;\n  }`,
    ),
  ],
  [
    'api-property-should-have-api-extra-models',
    DTO,
    `import { ApiProperty, getSchemaPath } from '@nestjs/swagger';\nimport { IsDefined } from 'class-validator';\n\nexport class Cat {}\n\nexport class CreateCatDto {\n  @ApiProperty({ oneOf: [{ $ref: getSchemaPath(Cat) }] })\n  @IsDefined()\n  readonly cat!: Cat;\n}\n`,
  ],
  [
    'api-operation-summary-description-capitalized',
    CONTROLLER,
    controller(
      `import { ApiOperation } from '@nestjs/swagger';\n`,
      `  @Get()\n  @ApiOperation({ summary: 'lowercase summary' })\n  findAll(): string[] {\n    return [];\n  }`,
    ),
  ],
];

const SWAGGER_ONLY_RULES = [
  'api-enum-property-best-practices',
  'api-method-should-specify-api-response',
  'api-property-matches-property-optionality',
  'api-property-returning-array-should-set-array',
  'controllers-should-supply-api-tags',
  'swagger-file-upload-should-be-documented',
];

const INJECTED_SUFFIXES = [
  'consumer',
  'controller',
  'filter',
  'gateway',
  'guard',
  'handler',
  'interceptor',
  'middleware',
  'pipe',
  'processor',
  'provider',
  'repository',
  'resolver',
  'service',
  'strategy',
];

const injected = (count: number) =>
  Array.from(
    { length: count },
    (_, index) => `    dependency${index}: string,`,
  ).join('\n');

const facade = (count: number) =>
  `import { Injectable } from '@nestjs/common';\n\n@Injectable()\nexport class Facade {\n  constructor(\n${injected(count)}\n  ) {}\n}\n`;

describe('realistic Nest files', () => {
  it.each(CLEAN_FILES)('lint clean: %s', async (_name, file, code) => {
    expect(await lintFile(code, file)).toEqual([]);
  });

  it.each(SWAGGER_CLEAN)(
    'lint clean with swagger: %s',
    async (_name, file, code) => {
      expect(await lintFile(code, file, swaggerEslint)).toEqual([]);
    },
  );
});

describe('rules', () => {
  it.each(FIRING_CASES)('reports %s', async (name, file, code) => {
    expect(await lintFile(code, file)).toContain(`${RULE}/${name}`);
  });

  it('leaves no nestjs rule at warning level', async () => {
    const config = await swaggerEslint.calculateConfigForFile(
      resolve(FIXTURES, SERVICE),
    );
    const levels = Object.entries(config?.rules ?? {})
      .filter(([name]) => name.startsWith(`${RULE}/`))
      .map(([, value]) => levelOf(value));

    expect(levels.length).toBeGreaterThan(20);
    expect(levels).not.toContain(1);
    expect(levels).not.toContain('warn');
  });

  it('does not apply to javascript files', async () => {
    const config = await eslint.calculateConfigForFile(
      resolve(FIXTURES, 'scripts/a.js'),
    );

    expect(
      Object.keys(config?.rules ?? {}).filter((name) =>
        name.startsWith(`${RULE}/`),
      ),
    ).toEqual([]);
  });
});

describe('swagger option', () => {
  it.each(SWAGGER_CASES)(
    'reports %s when the option is set',
    async (name, file, code) => {
      expect(await lintFile(code, file, swaggerEslint)).toContain(
        `${RULE}/${name}`,
      );
    },
  );

  it.each(SWAGGER_ONLY_RULES)('turns %s off by default', async (name) => {
    expect(levelOf(await ruleOptions(CONTROLLER, `${RULE}/${name}`))).toBe(0);
  });

  it.each(SWAGGER_ONLY_RULES)('turns %s on with the option', async (name) => {
    expect(
      levelOf(await ruleOptions(CONTROLLER, `${RULE}/${name}`, swaggerEslint)),
    ).toBe(2);
  });

  it('does not report undocumented controllers by default', async () => {
    const [, , code] = SWAGGER_CASES[0] ?? [];

    expect(await lintFile(code ?? '', CONTROLLER)).not.toContain(
      `${RULE}/controllers-should-supply-api-tags`,
    );
  });
});

describe('sourceGlobs option', () => {
  const lintController = (instance: ESLint) =>
    lintFile(fixture(CONTROLLER), CONTROLLER, instance);

  it('finds the modules that register a class, in any lint order', async () => {
    expect(
      await lintController(
        createEslint({ sourceGlobs: [`${FIXTURES}/src/*.ts`] }),
      ),
    ).not.toContain(PROVIDED);
  });

  it('reports a class when the globs match no module', async () => {
    expect(
      await lintController(createEslint({ sourceGlobs: ['nowhere/**/*.ts'] })),
    ).toContain(PROVIDED);
  });

  it('defaults to src/**/*.ts', async () => {
    const options = await ruleOptions(
      CONTROLLER,
      PROVIDED,
      new ESLint({
        cwd: FIXTURES,
        overrideConfigFile: true,
        overrideConfig: createNestjsConfig(),
      }),
    );

    expect(options).toEqual([
      2,
      expect.objectContaining({ src: ['src/**/*.ts'] }),
    ]);
  });

  it('skips spec and test files with escaped dots', async () => {
    const [, { filterFromPaths }] = (await ruleOptions(
      CONTROLLER,
      PROVIDED,
    )) as [string, { filterFromPaths: string[] }];
    const skipped = (path: string) =>
      filterFromPaths.some((pattern) => new RegExp(`(${pattern})`).test(path));

    expect(skipped('/app/src/cats.service.spec.ts')).toBe(true);
    expect(skipped('/app/src/cats.service.test.ts')).toBe(true);
    expect(skipped('/app/node_modules/pkg/index.ts')).toBe(true);
    expect(skipped('/app/test/fixtures/src/cats.module.ts')).toBe(false);
    expect(skipped('/home/latest/app/src/cats.module.ts')).toBe(false);
  });
});

describe('max-params', () => {
  it('allows five injected dependencies in a service', async () => {
    expect(await lintFile(facade(5), FACADE)).not.toContain('max-params');
  });

  it('reports six injected dependencies in a service', async () => {
    expect(await lintFile(facade(6), FACADE)).toContain('max-params');
  });

  it('keeps the limit of two elsewhere', async () => {
    expect(await lintFile(facade(3), 'src/example.ts')).toContain('max-params');
  });

  it.each(INJECTED_SUFFIXES)('raises the limit for *.%s.ts', async (suffix) => {
    expect(await ruleOptions(`src/cats.${suffix}.ts`, 'max-params')).toEqual([
      2, 5,
    ]);
  });

  it.each(['cats.module', 'create-cat.dto', 'cats.service.spec', 'example'])(
    'keeps the limit of two for %s.ts',
    async (name) => {
      expect(await ruleOptions(`src/${name}.ts`, 'max-params')).toEqual([2, 2]);
    },
  );
});

describe('overrides', () => {
  it('come last', () => {
    const override = { rules: { 'no-console': 'off' } } as Linter.Config;

    expect(createNestjsConfig({ overrides: [override] }).at(-1)).toMatchObject(
      override,
    );
  });
});

describe('package export', () => {
  it('resolves the /nestjs subpath', async () => {
    const exported = await import('@lwojcik/eslint-config/nestjs');

    expect(exported.createNestjsConfig).toBe(createNestjsConfig);
  });
});
