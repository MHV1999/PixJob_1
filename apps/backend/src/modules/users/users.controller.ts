import {
  Controller,
  Get,
  NotFoundException,
  UseGuards,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/infrastructure/decorators/current-user.decorator';
import type { RequestUser } from '../auth/infrastructure/strategies/jwt.strategy';
import { UserResponseDto } from '../auth/application/dtos/auth-response.dto';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../auth/domain/repositories/user.repository.interface';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
  ) {}

  /**
   * GET /api/v1/users/me
   *
   * Returns the current user's profile.
   * FIX 3: JwtAuthGuard performs a live DB status check before this executes,
   * so only ACTIVE users will ever reach this handler.
   */
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized or email not verified' })
  @ApiResponse({ status: 403, description: 'Account suspended or banned' })
  async getMe(@CurrentUser() currentUser: RequestUser): Promise<UserResponseDto> {
    const user = await this.userRepo.findById(currentUser.id);
    if (!user) throw new NotFoundException('User not found');

    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.username = user.username;
    dto.firstName = user.firstName;
    dto.lastName = user.lastName;
    dto.status = user.status;
    dto.roles = user.roles;
    dto.createdAt = user.createdAt;
    return dto;
  }
}
