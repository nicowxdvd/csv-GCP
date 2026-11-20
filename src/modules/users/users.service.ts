import { Injectable } from '@nestjs/common';
import type { User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { ListUsersQuery } from './dto/list-users.query.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateUserDto): Promise<User> {
    return this.prisma.user.create({ data });
  }

  findAll({ skip, take }: ListUsersQuery): Promise<User[]> {
    return this.prisma.user.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string): Promise<User> {
    return this.prisma.user.findUniqueOrThrow({ where: { id } });
  }
}
