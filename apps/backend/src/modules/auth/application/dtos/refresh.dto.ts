import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token (from body; cookie is preferred)' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
