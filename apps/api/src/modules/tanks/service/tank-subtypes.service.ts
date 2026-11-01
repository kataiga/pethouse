import {
  ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { TankType } from '@common/enums/tank-type.enum';
import { slugify } from '@common/slug';
import { Household } from '@modules/households/entity/household.entity';
import { CreateTankSubtypeDto } from '../dto/create-tank-subtype.dto';
import { TankSubtype } from '../entity/tank-subtype.entity';
import { TankSubtypeRepository } from '../repository/tank-subtype.repository';

export const SUBTYPE_IN_USE_OR_SYSTEM = 'Subtype not found';

@Injectable()
export class TankSubtypesService {
  constructor (
    @InjectRepository(TankSubtype)
    private readonly subtypes: TankSubtypeRepository,
  ) {}

  listVisible (householdIds: number[], tankType?: TankType): Promise<TankSubtype[]> {
    return this.subtypes.findVisible(householdIds, tankType);
  }

  findUsable (id: number, household: Household): Promise<TankSubtype | null> {
    return this.subtypes.findUsable(id, household.id);
  }

  async createCustom (household: Household, dto: CreateTankSubtypeDto): Promise<TankSubtype> {
    const slug = slugify(dto.name);

    if (slug.length === 0) {
      throw new ConflictException('The name must contain at least one letter or digit');
    }

    const clash = await this.subtypes.findOne({
      tankType: dto.tankType,
      slug,
      $or: [
        { household: null },
        { household },
      ],
    });

    if (clash) {
      throw new ConflictException(`A ${dto.tankType.toLowerCase()} subtype "${clash.name}" already exists`);
    }

    const subtype = this.subtypes.create({
      tankType: dto.tankType,
      slug,
      name: dto.name.trim(),
      isSystem: false,
      household,
    });
    await this.subtypes.getEntityManager().persistAndFlush(subtype);

    return subtype;
  }

  /** Only a household's own subtype can go; tanks pointing at it fall back to no subtype. */
  async deleteCustom (household: Household, id: number): Promise<void> {
    const subtype = await this.subtypes.findOne({
      id,
      household,
      isSystem: false,
    });

    if (!subtype) {
      throw new NotFoundException(SUBTYPE_IN_USE_OR_SYSTEM);
    }

    await this.subtypes.getEntityManager().removeAndFlush(subtype);
  }
}
