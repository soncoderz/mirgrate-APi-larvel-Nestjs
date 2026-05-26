/**
 * =============================================================================
 * groups.module.ts - Module quản lý Nhóm/Công ty (Groups)
 * =============================================================================
 *
 * Module quản lý groups (nhóm/công ty), hotlines, departments, modules.
 * Export GroupsService để ConnectorModule và các module khác tái sử dụng.
 * Có 2 controller: GroupsPublicController (public) và GroupsController (protected).
 *
 * Tương đương: GroupsController trong Laravel
 */

import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module";
import { DatabaseModule } from "../../config/database.module";
import { GroupsController, GroupsPublicController } from "./groups.controller";
import { GroupsService } from "./groups.service";

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [GroupsPublicController, GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
