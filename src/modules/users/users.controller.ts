import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { User } from '../../generated/prisma/client.js';
import { createUserSchema, type CreateUserDto } from './dto/create-user.dto.js';
import { listUsersQuerySchema, type ListUsersQuery } from './dto/list-users.query.js';
import { userIdParamSchema, type UserIdParam } from './dto/user-id.param.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {

  constructor(private readonly usersService: UsersService) {}


  @Post()
  create(@Body({ schema: createUserSchema }) dto: CreateUserDto): Promise<User> {
    return this.usersService.create(dto);

  }


  @Get()
  findAll(@Query({ schema: listUsersQuerySchema }) query: ListUsersQuery): Promise<User[]> {
    return this.usersService.findAll(query);

  }


  @Get(':id')
  findOne(@Param({ schema: userIdParamSchema }) { id }: UserIdParam): Promise<User> {
    return this.usersService.findOne(id);

  }

}
