import { SetMetadata } from '@nestjs/common';
import { HouseholdRole } from '@modules/households/entity/household-role.enum';

export const HOUSEHOLD_ROLE_KEY = 'householdRole';

/** Restricts a household route to members holding this role. Pairs with HouseholdMemberGuard. */
export const RequireHouseholdRole = (role: HouseholdRole): MethodDecorator & ClassDecorator =>
  SetMetadata(HOUSEHOLD_ROLE_KEY, role);
