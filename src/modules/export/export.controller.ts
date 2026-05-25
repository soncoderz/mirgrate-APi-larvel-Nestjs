import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { ExportService } from './export.service';

/**
 * ExportController - tương đương ExportController trong Laravel
 * Xử lý download file export
 */
@ApiTags('Export')
@Controller()
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  // GET /api/v1/export/:fileName
  @Get('export/:fileName')
  @ApiOperation({ summary: 'Download file đã export' })
  async download(@Param('fileName') fileName: string, @Res() res: Response) {
    // TODO: implement secure file download
    return res.json({ message: `File ${fileName} đang được tải xuống` });
  }

  // GET /api/v1/exportExample/:type
  @Get('exportExample/:type')
  @ApiOperation({ summary: 'Download file Excel mẫu' })
  async exportExample(@Param('type') type: string, @Res() res: Response) {
    // TODO: implement example file download
    return res.json({ message: `Template ${type} đang được tải xuống` });
  }
}
