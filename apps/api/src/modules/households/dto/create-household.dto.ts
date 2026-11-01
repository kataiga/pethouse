import { ApiProperty } from '@nestjs/swagger';
import {
  IsString, Length,
} from 'class-validator';
import { IsIanaTimeZone } from '@common/validators/is-iana-time-zone';

export class CreateHouseholdDto {
  @ApiProperty({
    example: 'Home',
    minLength: 1,
    maxLength: 80,
  })
  @IsString()
  @Length(1, 80)
  name!: string;

  @ApiProperty({
    example: 'Europe/Paris',
    description: 'IANA time zone; every routine of the household is scheduled against it.',
  })
  @IsIanaTimeZone()
  timezone!: string;
}
