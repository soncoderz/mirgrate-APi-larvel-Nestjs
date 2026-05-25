import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserLog } from './entities/user-log.entity';
import { IpLock } from './entities/ip-lock.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserLog, IpLock])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
