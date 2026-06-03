import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'john@example.com', description: 'Email or username' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(320)
  identifier!: string;

  @ApiProperty({ example: 'P@ssw0rd!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password!: string;
}
