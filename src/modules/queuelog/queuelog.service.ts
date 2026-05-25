import { Injectable } from '@nestjs/common';

/**
 * QueueLogService - tương đương App\Http\Controllers\Managers\QueueLogController trong Laravel
 * Sử dụng database voice_server_1
 */
@Injectable()
export class QueueLogService {
  // TODO: Inject QueueLog entity repository từ voice_server_1 connection

  async reportBySummary(filters: any) {
    // TODO: implement report by summary from queuelog table
    return { data: [] };
  }

  async reportByQueues(filters: any) {
    // TODO: implement report by queues
    return { data: [] };
  }

  async getQueueLog(filters: any, page = 1, perPage = 20) {
    // TODO: implement get queue log
    return { data: [], meta: { page, per_page: perPage, total: 0, last_page: 0 } };
  }

  async reportUnAnsweredByQueues(filters: any) {
    // TODO: implement unanswered report
    return { data: [] };
  }

  async getQueueLogMissCall(filters: any) {
    // TODO: implement miss call report
    return { data: [] };
  }

  async getInboundCalls(filters: any) {
    // TODO: implement inbound calls
    return { data: [] };
  }
}
