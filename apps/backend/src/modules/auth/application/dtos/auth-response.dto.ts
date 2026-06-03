import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@pixjob/shared-types';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  username!: string;

  @ApiPropertyOptional()
  firstName!: string | null;

  @ApiPropertyOptional()
  lastName!: string | null;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiProperty({ enum: UserRole, isArray: true })
  roles!: UserRole[];

  @ApiProperty()
  createdAt!: Date;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ description: 'Also set as HttpOnly cookie' })
  refreshToken!: string;

  @ApiProperty({ description: 'Access token TTL in seconds' })
  expiresIn!: number;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}
