import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, EntityManager } from "typeorm";
import { UserEntity } from "../entities/user.entity";
import { GroupEntity } from "../entities/group.entity";
import { UserLogEntity } from "../entities/user-log.entity";

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(UserEntity)
    public readonly user: Repository<UserEntity>,
    @InjectRepository(GroupEntity)
    public readonly group: Repository<GroupEntity>,
    @InjectRepository(UserLogEntity)
    public readonly log: Repository<UserLogEntity>,
    public readonly manager: EntityManager,
  ) {}
}
