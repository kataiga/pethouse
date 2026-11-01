#!/usr/bin/env ts-node

/**
 * Scaffolds a feature module following the conventions in `apps/api/CLAUDE.md`:
 *
 *   src/modules/<name>/
 *     <name>.module.ts
 *     controller/<name>.controller.ts
 *     service/<name>.service.ts
 *     service/<name>.service.spec.ts
 *     repository/<name>.repository.ts
 *     entity/<name>.entity.ts
 *     dto/<name>-response.dto.ts
 *
 * Usage: npm run generate:module <kebab-case-name>
 */

import * as fs from 'fs';
import * as path from 'path';

interface ModuleNames {
  /** `tank-photo` */
  kebab: string;
  /** `TankPhoto` */
  pascal: string;
  /** `tankPhoto` */
  camel: string;
  /** `tank-photos`, used for the route */
  route: string;
}

const KEBAB_CASE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

function toNames (kebab: string): ModuleNames {
  const pascal = kebab
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  return {
    kebab,
    pascal,
    camel: pascal.charAt(0).toLowerCase() + pascal.slice(1),
    route: kebab.endsWith('s') ? kebab : `${kebab}s`,
  };
}

function moduleTemplate (n: ModuleNames): string {
  return `import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ${n.pascal}Controller } from './controller/${n.kebab}.controller';
import { ${n.pascal} } from './entity/${n.kebab}.entity';
import { ${n.pascal}Service } from './service/${n.kebab}.service';

@Module({
  // Registering the entity also registers its custom repository, declared on the entity.
  imports: [MikroOrmModule.forFeature([${n.pascal}])],
  controllers: [${n.pascal}Controller],
  providers: [${n.pascal}Service],
  exports: [${n.pascal}Service],
})
export class ${n.pascal}Module {}
`;
}

function entityTemplate (n: ModuleNames): string {
  return `import {
  Entity, EntityRepositoryType, PrimaryKey, Property,
} from '@mikro-orm/core';
import { ${n.pascal}Repository } from '../repository/${n.kebab}.repository';

@Entity({
  tableName: '${n.route.replace(/-/g, '_')}',
  repository: () => ${n.pascal}Repository,
})
export class ${n.pascal} {
  [EntityRepositoryType]?: ${n.pascal}Repository;

  @PrimaryKey()
  id!: number;

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
`;
}

function repositoryTemplate (n: ModuleNames): string {
  return `import { EntityRepository } from '@mikro-orm/mysql';
import type { ${n.pascal} } from '../entity/${n.kebab}.entity';

export class ${n.pascal}Repository extends EntityRepository<${n.pascal}> {}
`;
}

function responseDtoTemplate (n: ModuleNames): string {
  return `import { ApiProperty } from '@nestjs/swagger';
import { ${n.pascal} } from '../entity/${n.kebab}.entity';

/** Public shape of a ${n.pascal}, decoupled from the entity. */
export class ${n.pascal}ResponseDto {
  @ApiProperty({ example: 1 })
  readonly id: number;

  @ApiProperty({ example: '2026-01-01T09:00:00.000Z' })
  readonly createdAt: string;

  @ApiProperty({ example: '2026-01-01T09:00:00.000Z' })
  readonly updatedAt: string;

  constructor (entity: ${n.pascal}) {
    this.id = entity.id;
    this.createdAt = entity.createdAt.toISOString();
    this.updatedAt = entity.updatedAt.toISOString();
  }

  static fromEntity (entity: ${n.pascal}): ${n.pascal}ResponseDto {
    return new ${n.pascal}ResponseDto(entity);
  }
}
`;
}

function serviceTemplate (n: ModuleNames): string {
  return `import {
  Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { ${n.pascal} } from '../entity/${n.kebab}.entity';
import { ${n.pascal}Repository } from '../repository/${n.kebab}.repository';

@Injectable()
export class ${n.pascal}Service {
  constructor (
    @InjectRepository(${n.pascal})
    private readonly ${n.camel}Repository: ${n.pascal}Repository,
  ) {}

  async findAll (): Promise<${n.pascal}[]> {
    return this.${n.camel}Repository.findAll();
  }

  async findOne (id: number): Promise<${n.pascal}> {
    const entity = await this.${n.camel}Repository.findOne({ id });

    if (!entity) {
      throw new NotFoundException(\`${n.pascal} \${id} not found\`);
    }

    return entity;
  }
}
`;
}

function serviceSpecTemplate (n: ModuleNames): string {
  return `import { NotFoundException } from '@nestjs/common';
import { ${n.pascal} } from '../entity/${n.kebab}.entity';
import { ${n.pascal}Repository } from '../repository/${n.kebab}.repository';
import { ${n.pascal}Service } from './${n.kebab}.service';

describe('${n.pascal}Service', () => {
  let repository: jest.Mocked<Pick<${n.pascal}Repository, 'findAll' | 'findOne'>>;
  let service: ${n.pascal}Service;

  beforeEach(() => {
    repository = {
      findAll: jest.fn(),
      findOne: jest.fn(),
    };
    service = new ${n.pascal}Service(repository as unknown as ${n.pascal}Repository);
  });

  it('returns the entity when it exists', async () => {
    const entity = new ${n.pascal}();
    repository.findOne.mockResolvedValue(entity);

    await expect(service.findOne(1)).resolves.toBe(entity);
  });

  it('throws NotFoundException when it does not', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOne(1)).rejects.toBeInstanceOf(NotFoundException);
  });
});
`;
}

function controllerTemplate (n: ModuleNames): string {
  return `import {
  Controller, Get, Param, ParseIntPipe,
} from '@nestjs/common';
import {
  ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '@common/dto/error-response.dto';
import { ${n.pascal}ResponseDto } from '../dto/${n.kebab}-response.dto';
import { ${n.pascal}Service } from '../service/${n.kebab}.service';

@ApiTags('${n.route}')
@Controller('${n.route}')
export class ${n.pascal}Controller {
  constructor (private readonly ${n.camel}Service: ${n.pascal}Service) {}

  @Get()
  @ApiOperation({ summary: 'List every ${n.pascal}.' })
  @ApiOkResponse({ type: [${n.pascal}ResponseDto] })
  async findAll (): Promise<${n.pascal}ResponseDto[]> {
    const entities = await this.${n.camel}Service.findAll();

    return entities.map(${n.pascal}ResponseDto.fromEntity);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one ${n.pascal} by id.' })
  @ApiOkResponse({ type: ${n.pascal}ResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async findOne (@Param('id', ParseIntPipe) id: number): Promise<${n.pascal}ResponseDto> {
    return ${n.pascal}ResponseDto.fromEntity(await this.${n.camel}Service.findOne(id));
  }
}
`;
}

function main (): void {
  const name = process.argv[2];

  if (!name || !KEBAB_CASE.test(name)) {
    console.error('Usage: npm run generate:module <kebab-case-name>   (e.g. tank-photo)');
    process.exit(1);
  }

  const n = toNames(name);
  const moduleDir = path.join(__dirname, '..', 'modules', n.kebab);

  if (fs.existsSync(moduleDir)) {
    console.error(`Module "${n.kebab}" already exists at ${moduleDir}.`);
    process.exit(1);
  }

  const files: Record<string, string> = {
    [`${n.kebab}.module.ts`]: moduleTemplate(n),
    [`controller/${n.kebab}.controller.ts`]: controllerTemplate(n),
    [`service/${n.kebab}.service.ts`]: serviceTemplate(n),
    [`service/${n.kebab}.service.spec.ts`]: serviceSpecTemplate(n),
    [`repository/${n.kebab}.repository.ts`]: repositoryTemplate(n),
    [`entity/${n.kebab}.entity.ts`]: entityTemplate(n),
    [`dto/${n.kebab}-response.dto.ts`]: responseDtoTemplate(n),
  };

  for (const [relativePath, content] of Object.entries(files)) {
    const target = path.join(moduleDir, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
    console.log(`created src/modules/${n.kebab}/${relativePath}`);
  }

  console.log(`Module "${n.pascal}Module" generated. Import it in app.module.ts and write its migration.`);
}

main();
