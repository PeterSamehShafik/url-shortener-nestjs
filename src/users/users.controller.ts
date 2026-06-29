import { Controller, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { User } from './entities/user.entity';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiCookieAuth('accessToken')
  @Get(':id')
  @ApiOperation({
    summary: 'Retrieve user details by ID',
    description:
      'Fetches profile metadata configurations belonging to a specific user record.',
  })
  @ApiResponse({
    status: 200,
    description: 'User entry retrieved successfully.',
    type: User,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or expired session access token.',
  })
  @ApiNotFoundResponse({
    description: 'Target user record could not be found.',
  })
  findOne(@Param('id') id: string): Promise<User | null> {
    return this.usersService.findById(id);
  }
}
