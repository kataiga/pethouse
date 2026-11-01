import { ApiProperty } from '@nestjs/swagger';
import { TankType } from '@common/enums/tank-type.enum';
import { RoutineTemplate } from '../entity/routine-template.entity';

export class RoutineTemplateResponseDto {
  @ApiProperty({ example: 1 })
  readonly id: number;

  @ApiProperty({
    enum: TankType,
    enumName: 'TankType',
  })
  readonly tankType: TankType;

  @ApiProperty({
    example: 'routine.water-change.name',
    description: 'i18n key of the suggested name.',
  })
  readonly nameKey: string;

  @ApiProperty({ example: 'routine.water-change.description' })
  readonly descriptionKey: string;

  @ApiProperty({
    example: 'FREQ=WEEKLY;BYDAY=SA;BYHOUR=10;BYMINUTE=0',
    description: 'Suggested RRULE body; pair it with a local dtstart to create a routine.',
  })
  readonly defaultRrule: string;

  constructor (template: RoutineTemplate) {
    this.id = template.id;
    this.tankType = template.tankType;
    this.nameKey = template.nameKey;
    this.descriptionKey = template.descriptionKey;
    this.defaultRrule = template.defaultRrule;
  }

  static fromEntity (template: RoutineTemplate): RoutineTemplateResponseDto {
    return new RoutineTemplateResponseDto(template);
  }
}
