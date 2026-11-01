import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail, IsString, MaxLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'alex@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'correct horse battery staple' })
  @IsString()
  @MaxLength(128)
  password!: string;
}
