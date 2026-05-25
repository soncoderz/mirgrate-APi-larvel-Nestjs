import { Injectable } from '@nestjs/common';

/**
 * IvrInboundService - tương đương IvrInboundController trong Laravel
 */
@Injectable()
export class IvrInboundService {
  async getIVRInboundDID(filters: any) {
    // TODO: implement get IVR inbound DID
    return { data: [] };
  }

  async addEditDIDForIVRInbound(data: any) {
    // TODO: implement add/edit DID
    return { message: 'Đã cập nhật DID' };
  }

  async getIVRInboundRecord(filters: any) {
    // TODO: implement get records
    return { data: [] };
  }

  async getIVRInboundTimeCondition(filters: any) {
    // TODO: implement time conditions
    return { data: [] };
  }

  async getIVRInboundTimeGroup(filters: any) {
    // TODO: implement time groups
    return { data: [] };
  }

  async getIVRInboundIVR(filters: any) {
    // TODO: implement get IVR
    return { data: [] };
  }
}
