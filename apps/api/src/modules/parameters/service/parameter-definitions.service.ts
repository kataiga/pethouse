import {
  ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { slugify } from '@common/slug';
import { Household } from '@modules/households/entity/household.entity';
import { CreateParameterDefinitionDto } from '../dto/create-parameter-definition.dto';
import { ParameterDefinition } from '../entity/parameter-definition.entity';
import { ParameterDefinitionRepository } from '../repository/parameter-definition.repository';

@Injectable()
export class ParameterDefinitionsService {
  constructor (
    @InjectRepository(ParameterDefinition)
    private readonly definitions: ParameterDefinitionRepository,
  ) {}

  listVisible (householdIds: number[]): Promise<ParameterDefinition[]> {
    return this.definitions.findVisible(householdIds);
  }

  findUsable (id: number, household: Household): Promise<ParameterDefinition | null> {
    return this.definitions.findUsable(id, household.id);
  }

  async createCustom (household: Household, dto: CreateParameterDefinitionDto): Promise<ParameterDefinition> {
    const slug = slugify(dto.name);

    if (slug.length === 0) {
      throw new ConflictException('The name must contain at least one letter or digit');
    }

    const clash = await this.definitions.findOne({
      slug,
      $or: [
        { household: null },
        { household },
      ],
    });

    if (clash) {
      throw new ConflictException(`A parameter "${clash.name}" already exists`);
    }

    const definition = this.definitions.create({
      slug,
      name: dto.name.trim(),
      unit: dto.unit.trim(),
      decimals: dto.decimals,
      isSystem: false,
      household,
    });
    await this.definitions.getEntityManager().persistAndFlush(definition);

    return definition;
  }

  /** Only a household's own definition can go; its settings, overrides and measurements go with it. */
  async deleteCustom (household: Household, id: number): Promise<void> {
    const definition = await this.definitions.findOne({
      id,
      household,
      isSystem: false,
    });

    if (!definition) {
      throw new NotFoundException('Parameter definition not found');
    }

    await this.definitions.getEntityManager().removeAndFlush(definition);
  }
}
