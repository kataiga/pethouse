#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

const moduleName = process.argv[2];

if (!moduleName) {
  console.error('❌ Please provide a module name: npm run generate:module <name>');
  process.exit(1);
}

const pascalName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
const moduleDir = path.join(__dirname, `../modules/${moduleName}`);

if (fs.existsSync(moduleDir)) {
  console.error(`❌ Module "${moduleName}" already exists.`);
  process.exit(1);
}

fs.mkdirSync(moduleDir, { recursive: true });
fs.mkdirSync(path.join(moduleDir, 'dto'));

// --- module ---
fs.writeFileSync(
  path.join(moduleDir, `${moduleName}.module.ts`),
  `import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ${pascalName}Service } from './${moduleName}.service';
import { ${pascalName} } from './${moduleName}.entity';
import { ${pascalName}Controller } from './${moduleName}.controller';

@Module({
  imports: [MikroOrmModule.forFeature([${pascalName}])],
  controllers: [${pascalName}Controller],
  providers: [${pascalName}Service],
  exports: [${pascalName}Service],
})
export class ${pascalName}Module {}
`,
);

// --- controller ---
fs.writeFileSync(
  path.join(moduleDir, `${moduleName}.controller.ts`),
  `import { 
  Controller, 
  Get, 
  Post, 
  Body 
} from '@nestjs/common';
import { ${pascalName}Service } from './${moduleName}.service';
import { ${pascalName} } from './${moduleName}.entity';

@Controller('${moduleName}')
export class ${pascalName}Controller {
  constructor(private readonly ${moduleName}Service: ${pascalName}Service) {}

}
`,
);

// --- service ---
fs.writeFileSync(
  path.join(moduleDir, `${moduleName}.service.ts`),
  `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { ${pascalName} } from './${moduleName}.entity';

@Injectable()
export class ${pascalName}Service {
  constructor(
    @InjectRepository(${pascalName})
    private readonly ${moduleName}Repository: EntityRepository<${pascalName}>,
  ) {}

}
`,
);

// --- entity ---
fs.writeFileSync(
  path.join(moduleDir, `${moduleName}.entity.ts`),
  `import { 
  Entity, 
  PrimaryKey, 
  Property, 
} from '@mikro-orm/core';

@Entity()
export class ${pascalName} {
  @PrimaryKey()
    id: number;
}
`,
);

// -- repository --
fs.writeFileSync(
  path.join(moduleDir, `${moduleName}.repository.ts`),
  `import { EntityRepository } from '@mikro-orm/mysql';
import { Injectable } from '@nestjs/common';
import { ${pascalName} } from './tank.entity';
  
export class ${pascalName}Repository extends EntityRepository<${pascalName}> {  
}
`,
);

console.log(`✅ Module "${moduleName}" successfully generated! 🚀`);
