import { Injectable, StreamableFile } from '@nestjs/common';
import { createReadStream } from 'fs';
import { join } from 'path';

/**
 * ExportService - tương đương ExportController trong Laravel
 * Xử lý download file đã export và template mẫu
 */
@Injectable()
export class ExportService {
  private readonly exportDir = join(process.cwd(), 'storage', 'exports');

  async downloadFile(fileName: string) {
    // TODO: implement file download from exports directory
    const file = createReadStream(join(this.exportDir, fileName));
    return new StreamableFile(file);
  }

  async getExampleTemplate(type: string) {
    // TODO: implement get example Excel template
    return { type, url: `/api/v1/exportExample/${type}` };
  }
}
