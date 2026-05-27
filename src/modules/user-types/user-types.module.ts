import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CommonModule } from "../../common/common.module";
import { DatabaseModule } from "../../config/database.module";
import { UserPrivilegeEntity } from "./entities/user-privilege.entity";
import { UserTypeEntity } from "./entities/user-type.entity";
import { UserTypesController } from "./user-types.controller";
import { UserTypesService } from "./user-types.service";

@Module({
  imports: [
    CommonModule,
    DatabaseModule,
    TypeOrmModule.forFeature([UserTypeEntity, UserPrivilegeEntity]),
  ],
  controllers: [UserTypesController],
  providers: [UserTypesService],
})
export class UserTypesModule {}
