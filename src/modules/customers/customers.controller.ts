import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Customers')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // GET /api/v1/customer/:userId
  @Get('customer/:userId')
  @ApiOperation({ summary: 'Lấy khách hàng theo user ID' })
  getCustomerByID(@Param('userId') userId: string) {
    return this.customersService.getCustomerById(+userId);
  }

  // GET /api/v1/customers/latest
  @Get('customers/latest')
  @ApiOperation({ summary: 'Lấy khách hàng gần đây nhất' })
  getLatestCustomer() {
    // TODO: implement get latest customer
    return { data: null };
  }

  // POST /api/v1/customers
  @Post('customers')
  @ApiOperation({ summary: 'Lấy danh sách khách hàng có phân trang và filter' })
  getCustomers(@Body() filters: any) {
    const { page = 1, per_page = 20, ...rest } = filters;
    return this.customersService.getCustomers(rest, page, per_page);
  }

  // POST /api/v1/addCustomer
  @Post('addCustomer')
  @ApiOperation({ summary: 'Thêm khách hàng mới' })
  addCustomer(@Body() body: any) {
    return this.customersService.addCustomer(body);
  }

  // POST /api/v1/addCustomerAndNote
  @Post('addCustomerAndNote')
  @ApiOperation({ summary: 'Thêm khách hàng kèm ghi chú' })
  addCustomerAndNote(@Body() body: any) {
    // TODO: implement add customer and note
    return this.customersService.addCustomer(body);
  }

  // POST /api/v1/updateCustomer
  @Post('updateCustomer')
  @ApiOperation({ summary: 'Cập nhật thông tin khách hàng' })
  updateCustomer(@Body() body: any) {
    const { id, ...data } = body;
    return this.customersService.updateCustomer(id, data);
  }

  // POST /api/v1/updateCustomerV2
  @Post('updateCustomerV2')
  @ApiOperation({ summary: 'Cập nhật thông tin khách hàng (v2)' })
  updateCustomerV2(@Body() body: any) {
    const { id, ...data } = body;
    return this.customersService.updateCustomer(id, data);
  }

  // GET /api/v1/removeCustomer/:id
  @Get('removeCustomer/:id')
  @ApiOperation({ summary: 'Xóa khách hàng theo ID' })
  removeCustomer(@Param('id') id: string) {
    return this.customersService.removeCustomer(+id);
  }

  // PUT /api/v1/removeCustomers
  @Put('removeCustomers')
  @ApiOperation({ summary: 'Xóa nhiều khách hàng' })
  removeCustomers(@Body() body: { ids: number[] }) {
    // TODO: implement remove multiple customers
    return { message: 'Đã xóa các khách hàng' };
  }

  // PUT /api/v1/updateCustomerTags/:id
  @Put('updateCustomerTags/:id')
  @ApiOperation({ summary: 'Cập nhật tags của khách hàng' })
  updateCustomerTags(@Param('id') id: string, @Body() body: any) {
    return this.customersService.updateCustomer(+id, { tags: body.tags });
  }

  // GET /api/v1/getCustomerByPhone/:phone
  @Get('getCustomerByPhone/:phone')
  @ApiOperation({ summary: 'Lấy khách hàng theo số điện thoại' })
  getCustomerByPhone(@Param('phone') phone: string) {
    return this.customersService.getCustomerByPhone(phone);
  }

  // GET /api/v1/duplicateCustomer/:id
  @Get('duplicateCustomer/:id')
  @ApiOperation({ summary: 'Nhân đôi thông tin khách hàng' })
  duplicateCustomer(@Param('id') id: string) {
    // TODO: implement duplicate customer
    return { message: `Đã nhân đôi khách hàng ${id}` };
  }

  // POST /api/v1/exportCustomer
  @Post('exportCustomer')
  @ApiOperation({ summary: 'Xuất danh sách khách hàng ra Excel' })
  exportCustomer(@Body() filters: any) {
    // TODO: implement Excel export
    return { message: 'Export đang được xử lý' };
  }

  // POST /api/v1/addCustomerByExcel
  @Post('addCustomerByExcel')
  @ApiOperation({ summary: 'Import khách hàng từ file Excel' })
  addCustomerByExcel(@Body() body: any) {
    // TODO: implement import from Excel
    return { message: 'Import đang được xử lý' };
  }
}
