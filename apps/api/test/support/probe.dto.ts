import {
  IsInt, IsString, Min,
} from 'class-validator';

/** Input DTO used only by the e2e suite to exercise the global ValidationPipe. */
export class ProbeDto {
  @IsString()
  name = '';

  @IsInt()
  @Min(0)
  quantity = 0;
}
