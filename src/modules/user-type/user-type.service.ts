import { Injectable } from '@nestjs/common';

@Injectable()
export class UserTypeService {
  async getUserTypes() {
    // TODO: implement get all user types
    return { data: [] };
  }

  async getUserType(id: number) {
    // TODO: implement get user type by id
    return { data: null };
  }

  async getUserTypesWithPage(filters: any, page = 1, perPage = 20) {
    // TODO: implement paginated user types
    return { data: [], meta: { page, per_page: perPage, total: 0, last_page: 0 } };
  }

  async insertUserType(data: any) {
    // TODO: implement insert user type
    return { message: 'Đã thêm loại user' };
  }

  async updateUserType(id: number, data: any) {
    // TODO: implement update user type
    return { message: 'Đã cập nhật loại user' };
  }

  async deleteUserType(id: number) {
    // TODO: implement delete user type
    return { message: 'Đã xóa loại user' };
  }
}
