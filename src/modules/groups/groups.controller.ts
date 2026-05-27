/**
 * =============================================================================
 * groups.controller.ts - Controller quản lý Nhóm/Công ty (Groups)
 * =============================================================================
 *
 * File này chứa 2 controller:
 *
 * 1. GroupsPublicController → Route PUBLIC (không cần JWT):
 *    - groupBySecret: Lấy group theo secret key (ĐÃ MIGRATE)
 *    - getExtensionQueueBySecret: Extensions + Queues theo secret (ĐÃ MIGRATE)
 *    - getQueueBySecret: Queues theo secret (ĐÃ MIGRATE)
 *    - getExtensionNameBySecret: Tên extension theo secret (ĐÃ MIGRATE)
 *    - addExtensionByGroup: Thêm extension (CHƯA MIGRATE)
 *    - cronjob*: Các job định kỳ (CHƯA MIGRATE)
 *
 * 2. GroupsController → Route PROTECTED (cần JWT):
 *    - groupsWithPage: Danh sách groups phân trang (ĐÃ MIGRATE)
 *    - groups, group/:id: CRUD group (ĐÃ MIGRATE)
 *    - getHotline: Lấy cấu hình hotline (ĐÃ MIGRATE)
 *    - getUserModules: Lấy modules (ĐÃ MIGRATE)
 *    - getDepartments: Phân trang departments (ĐÃ MIGRATE)
 *    - getExtensionsDepartment: Extensions theo phòng ban (ĐÃ MIGRATE)
 *    - reason/getList: Danh sách lý do (ĐÃ MIGRATE)
 *    - Nhiều endpoints khác (CHƯA MIGRATE - trả 501)
 *
 * Dùng class kế thừa GroupsStubBase để chia sẻ logic notMigrated() giữa 2 controller.
 *
 * Tương đương: GroupsController trong Laravel
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MigrationStubService } from "../../common/services/migration-stub.service";
import { GroupsService } from "./groups.service";

/** Type mở rộng Request với thông tin user từ JWT payload */
type RequestWithUser = Request & { user?: Record<string, unknown> };

class GroupsStubBase {
  constructor(
    protected readonly stub: MigrationStubService,
    protected readonly groups: GroupsService,
  ) {}

  protected notMigrated(
    action: string,
    method: string,
    path: string,
    body?: unknown,
    params?: unknown,
  ) {
    return this.stub.notMigrated({
      controller: "GroupsController",
      action,
      method,
      path,
      body,
      params,
    });
  }
}

@Controller("v1")
export class GroupsPublicController extends GroupsStubBase {
  constructor(stub: MigrationStubService, groups: GroupsService) {
    super(stub, groups);
  }

  @Get(["groupBySecret", "groupBySecret/:secret"])
  getGroupBySecret(@Param("secret") secret?: string) {
    return this.groups.getGroupBySecret(secret);
  }

  @Get(["getExtensionQueueBySecret", "getExtensionQueueBySecret/:secret"])
  getExtensionQueueBySecret(@Param("secret") secret?: string) {
    return this.groups.getExtensionQueueBySecret(secret);
  }

  @Get(["getQueueBySecret", "getQueueBySecret/:secret"])
  getQueueBySecret(@Param("secret") secret?: string) {
    return this.groups.getQueuesBySecret(secret);
  }

  @Post("addExtensionByGroup")
  addExtensionByGroup(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "addExtensionByGroup",
      "POST",
      "/api/v1/addExtensionByGroup",
      body,
    );
  }

  @Get(["getExtensionNameBySecret", "getExtensionNameBySecret/:secret"])
  getExtensionNameBySecret(@Param("secret") secret?: string) {
    return this.groups.getExtensionNameBySecret(secret);
  }

  @Get("files/cronjobScanFileDownload")
  cronjobScanFileDownload() {
    return this.notMigrated(
      "cronjobScanFileDownload",
      "GET",
      "/api/v1/files/cronjobScanFileDownload",
    );
  }

  @Get("cronjobDailyLogoutQueuePDS")
  cronjobDailyLogoutQueuePDS() {
    return this.notMigrated(
      "cronjobDailyLogoutQueuePDS",
      "GET",
      "/api/v1/cronjobDailyLogoutQueuePDS",
    );
  }

  @Get("cronjobReportSummaryHalfDay")
  cronjobReportSummaryHalfDay() {
    return this.notMigrated(
      "cronjobReportSummaryHalfDay",
      "GET",
      "/api/v1/cronjobReportSummaryHalfDay",
    );
  }

  @Get("scanUpdateCauseCode")
  scanUpdateCauseCode() {
    return this.notMigrated(
      "scanUpdateCauseCode",
      "GET",
      "/api/v1/scanUpdateCauseCode",
    );
  }
}

@Controller("v1")
@UseGuards(JwtAuthGuard)
export class GroupsController extends GroupsStubBase {
  constructor(stub: MigrationStubService, groups: GroupsService) {
    super(stub, groups);
  }

  @Get("readConfigModules")
  readConfigModules() {
    return this.notMigrated(
      "readConfigModules",
      "GET",
      "/api/v1/readConfigModules",
    );
  }

  @Post("writeConfigModules")
  writeConfigModules(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "writeConfigModules",
      "POST",
      "/api/v1/writeConfigModules",
      body,
    );
  }

  @Post("groupsWithPage")
  getGroupsWithPage(
    @Body() body: Record<string, unknown>,
    @Req() request: RequestWithUser,
  ) {
    return this.groups.getGroupsWithPage(body, request.user);
  }

  @Post("groupsWithPagev2")
  getGroupsWithPagev2(
    @Body() body: Record<string, unknown>,
    @Req() request: RequestWithUser,
  ) {
    return this.groups.getGroupsWithPage(body, request.user);
  }

  @Post("groupsWithPagev3")
  getGroupsWithPagev3(
    @Body() body: Record<string, unknown>,
    @Req() request: RequestWithUser,
  ) {
    return this.groups.getGroupsWithPage(body, request.user);
  }

  @Post("getGroupInfov2")
  getGroupInfov2(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "getGroupInfov2",
      "POST",
      "/api/v1/getGroupInfov2",
      body,
    );
  }

  @Get("groups")
  getGroups() {
    return this.groups.getGroups();
  }

  @Get("group/:groupId")
  getGroup(@Param("groupId") groupId: string) {
    return this.groups.getGroup(groupId);
  }

  @Post("addGrouphotline")
  addGroupHotline(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "addGroupHotline",
      "POST",
      "/api/v1/addGrouphotline",
      body,
    );
  }

  @Get(["getHotline", "getHotline/:groupId"])
  getHotline(@Param("groupId") groupId?: string) {
    return this.groups.getHotline(groupId);
  }

  @Post("addGroup")
  addGroup(@Body() body: Record<string, unknown>) {
    return this.notMigrated("addGroup", "POST", "/api/v1/addGroup", body);
  }

  @Put("updateGroup/:groupId")
  updateGroup(
    @Param("groupId") groupId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.notMigrated(
      "updateGroup",
      "PUT",
      "/api/v1/updateGroup/{groupId}",
      body,
      {
        groupId,
      },
    );
  }

  @Get("getExtensionByGroup/:groupId")
  getExtensionByGroup(@Param("groupId") groupId: string) {
    return this.groups
      .getHotline(groupId)
      .then((hotlines) =>
        hotlines
          .flatMap((hotline) => String(hotline.extensions ?? "").split(","))
          .filter(Boolean),
      );
  }

  @Post("updatewebhook")
  updateWebhook(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "updateWebhook",
      "POST",
      "/api/v1/updatewebhook",
      body,
    );
  }

  @Post("updateConfigSMS")
  updateConfigSMS(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "updateConfigSMS",
      "POST",
      "/api/v1/updateConfigSMS",
      body,
    );
  }

  @Post("updateConfigDashboard")
  updateConfigDashboard(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "updateConfigDashboard",
      "POST",
      "/api/v1/updateConfigDashboard",
      body,
    );
  }

  @Post("duplicateGroup")
  duplicateGroup(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "duplicateGroup",
      "POST",
      "/api/v1/duplicateGroup",
      body,
    );
  }

  @Delete("deleteGroup/:id")
  deleteGroup(@Param("id") id: string) {
    return this.notMigrated(
      "deleteGroup",
      "DELETE",
      "/api/v1/deleteGroup/{id}",
      undefined,
      {
        id,
      },
    );
  }

  @Post("deleteGroups")
  deleteGroups(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "deleteGroups",
      "POST",
      "/api/v1/deleteGroups",
      body,
    );
  }

  @Post("deleteGroupHotline")
  deleteGroupHotline(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "deleteGroupHotline",
      "POST",
      "/api/v1/deleteGroupHotline",
      body,
    );
  }

  @Get(["getUserModules", "getUserModules/:groupId"])
  getUserModules(@Param("groupId") groupId?: string) {
    return this.groups.getUserModules(groupId);
  }

  @Get("duplicateModule/:groupId/:groupIdTo")
  duplicateModule(
    @Param("groupId") groupId: string,
    @Param("groupIdTo") groupIdTo: string,
  ) {
    return this.notMigrated(
      "duplicateModule",
      "GET",
      "/api/v1/duplicateModule/{groupId}/{groupIdTo}",
      undefined,
      { groupId, groupIdTo },
    );
  }

  @Post("addUserModules")
  addUserModules(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "addUserModules",
      "POST",
      "/api/v1/addUserModules",
      body,
    );
  }

  @Post("updateCampaignProcess")
  updateCampaignProcess(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "updateCampaignProcess",
      "POST",
      "/api/v1/updateCampaignProcess",
      body,
    );
  }

  @Post("getDepartments")
  getDepartmentsWithPage(
    @Body() body: Record<string, unknown>,
    @Req() request: RequestWithUser,
  ) {
    return this.groups.getDepartmentsWithPage(body, request.user);
  }

  @Post("deleteDepartment")
  deleteDepartment(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "deleteDepartment",
      "POST",
      "/api/v1/deleteDepartment",
      body,
    );
  }

  @Post("getExtensionsDepartment")
  getExtensionsDepartment(@Body() body: Record<string, unknown>) {
    return this.groups.getExtensionsDepartment(body);
  }

  @Post("addDepartment")
  addDepartment(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "addDepartment",
      "POST",
      "/api/v1/addDepartment",
      body,
    );
  }

  @Post("updateDepartment")
  updateDepartment(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "updateDepartment",
      "POST",
      "/api/v1/updateDepartment",
      body,
    );
  }

  @Post("updateExtDepartment")
  updateExtDepartment(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "updateExtDepartment",
      "POST",
      "/api/v1/updateExtDepartment",
      body,
    );
  }

  @Post("updateDepartmentUser")
  updateDepartmentUser(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "updateDepartmentUser",
      "POST",
      "/api/v1/updateDepartmentUser",
      body,
    );
  }

  @Get("reason/getList/:groupId")
  getListReason(@Param("groupId") groupId: string) {
    return this.groups.getListReason(groupId);
  }

  @Post("getListDownload")
  getListDownload(@Body() body: Record<string, unknown>) {
    return this.notMigrated(
      "getListDownload",
      "POST",
      "/api/v1/getListDownload",
      body,
    );
  }

  @Get("getUserModulesSort")
  getUserModulesSort() {
    return this.groups.getUserModulesSort();
  }
}
