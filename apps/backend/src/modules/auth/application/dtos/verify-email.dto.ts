import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ example: 'abc123xyz', description: 'Email verification token' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 128)
  token!: string;
}
