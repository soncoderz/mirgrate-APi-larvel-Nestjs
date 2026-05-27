/**
 * =============================================================================
 * connector.module.ts - Module API Connector cho hệ thống bên ngoài
 * =============================================================================
 *
 * Module cho phép hệ thống bên ngoài (PBX, CRM, ...) gọi vào API.
 * Import CdrModule, GroupsModule, UsersModule để tái sử dụng logic đã migrate.
 *
 * Tương đương với nhóm route 'connector' trong Laravel routes/api.php.
 */

import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module";
import { CdrModule } from "../cdr/cdr.module";
import { GroupsModule } from "../groups/groups.module";
import { UsersModule } from "../users/users.module";
import { ConnectorController } from "./connector.controller";
import { ConnectorService } from "./connector.service";

@Module({
  imports: [
    CommonModule,   // Guards, JWT, helper services
    CdrModule,      // CdrService cho endpoint cdr/getCalls, cdr/getStaticCalls
    GroupsModule,   // GroupsService cho endpoint groupBySecret
    UsersModule,    // UsersService cho endpoint usersByExt
  ],
  controllers: [ConnectorController],
  providers: [ConnectorService],  // Service placeholder (chưa có logic riêng)
})
export class ConnectorModule {}
