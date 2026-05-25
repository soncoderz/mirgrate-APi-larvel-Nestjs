import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserLog } from './entities/user-log.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(UserLog)
    private userLogRepository: Repository<UserLog>,
  ) {}

  /**
   * Lấy danh sách users - tương đương UsersController::getUsers()
   * POST /api/v1/users
   */
  async getUsers(filters: any, page = 1, perPage = 20) {
    const qb = this.userRepository.createQueryBuilder('user');

    if (filters.group_id) {
      qb.andWhere('user.group_id = :groupId', { groupId: filters.group_id });
    }
    if (filters.search) {
      qb.andWhere('(user.username LIKE :search OR user.email LIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    const [items, total] = await qb
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount();

    return {
      data: items.map(({ password, remember_token, ...u }) => u),
      meta: { page, per_page: perPage, total, last_page: Math.ceil(total / perPage) },
    };
  }

  /**
   * Lấy user theo ID - tương đương UsersController::getUserByID()
   * GET /api/v1/user/{id}
   */
  async getUserById(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) return null;
    const { password, remember_token, ...userData } = user as any;
    return userData;
  }

  /**
   * Lấy user theo extension - tương đương UsersController::getUserInfoByExtension()
   * POST /api/v1/usersByExt
   */
  async getUserByExtension(extension: string) {
    const user = await this.userRepository.findOne({ where: { extension } });
    if (!user) return null;
    const { password, remember_token, ...userData } = user as any;
    return userData;
  }

  /**
   * Cập nhật user - tương đương UsersController::updateUser()
   * POST /api/v1/updateUser
   */
  async updateUser(userId: number, data: Partial<User>) {
    const { password, ...safeData } = data as any;
    await this.userRepository.update(userId, safeData);
    return this.getUserById(userId);
  }

  /**
   * Xóa user - tương đương UsersController::removeUser()
   * POST /api/v1/deleteUser
   */
  async removeUser(userId: number) {
    await this.userRepository.update(userId, { status: 0 });
    return { message: 'Đã xóa user thành công' };
  }

  /**
   * Lấy user logs - tương đương UsersController::getUserLogs()
   * POST /api/v1/getUserLogs
   */
  async getUserLogs(filters: any, page = 1, perPage = 20) {
    const qb = this.userLogRepository.createQueryBuilder('log');

    if (filters.user_id) {
      qb.andWhere('log.user_id = :userId', { userId: filters.user_id });
    }

    const [items, total] = await qb
      .orderBy('log.created_at', 'DESC')
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount();

    return { data: items, meta: { page, per_page: perPage, total, last_page: Math.ceil(total / perPage) } };
  }
}
