import { EntityRepository } from '@mikro-orm/mysql';
import type { Household } from '../entity/household.entity';

export class HouseholdRepository extends EntityRepository<Household> {}
