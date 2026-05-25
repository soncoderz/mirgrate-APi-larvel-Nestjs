import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { UserLog } from '../users/entities/user-log.entity';
import { IpLock } from '../users/entities/ip-lock.entity';
import { LoginDto, ForgotPasswordDto, ChangePasswordForgotDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(UserLog)
    private userLogRepository: Repository<UserLog>,

    @InjectRepository(IpLock)
    private ipLockRepository: Repository<IpLock>,

    private jwtService: JwtService,
  ) {}

  /**
   * Tương đương UsersController::login() trong Laravel
   * POST /api/v1/login
   */
  async login(dto: LoginDto, ip: string) {
    // Kiểm tra IP bị khóa
    const ipLock = await this.ipLockRepository.findOne({ where: { ip_client: ip } });
    if (ipLock) {
      const lockDurationSeconds = 10 * 60; // 10 phút
      const now = Math.floor(Date.now() / 1000);
      if (now - ipLock.lock_time < lockDurationSeconds) {
        throw new HttpException(
          { info: 'Bạn đã bị chặn truy cập, liên hệ quản trị viên để mở khóa.', alias: 'Error_Ip_Lock' },
          HttpStatus.NOT_ACCEPTABLE,
        );
      }
    }

    const log = this.userLogRepository.create({
      email: dto.email,
      ip_client: ip,
      created_at: new Date(),
    });

    // Tìm user
    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!user) {
      log.status = 'fail';
      log.sign_in_time = Math.floor(Date.now() / 1000);
      await this.userLogRepository.save(log);
      return this.handleLoginFail(dto.email, ip);
    }

    // Kiểm tra password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      log.status = 'fail';
      log.sign_in_time = Math.floor(Date.now() / 1000);
      await this.userLogRepository.save(log);
      return this.handleLoginFail(dto.email, ip);
    }

    // Đăng nhập thành công
    log.status = 'success';
    log.sign_in_time = Math.floor(Date.now() / 1000);
    log.user_id = user.id;
    await this.userLogRepository.save(log);

    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    const { password, remember_token, ...userWithoutSensitive } = user as any;

    return {
      access_token: token,
      token_type: 'bearer',
      user: userWithoutSensitive,
    };
  }

  /**
   * Tương đương UsersController::me() / checkToken() trong Laravel
   * POST /api/v1/checkToken hoặc GET /api/v1/me
   */
  async getMe(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Token không hợp lệ');
    }
    const { password, remember_token, ...userData } = user as any;
    return userData;
  }

  /**
   * Tương đương UsersController::logout() trong Laravel
   * POST /api/v1/logout
   */
  async logout(userId: number) {
    await this.userRepository.update(userId, { isOnline: 0 });
    return { message: 'Đăng xuất thành công' };
  }

  /**
   * Kiểm tra IP bị khóa và tăng số lần fail
   */
  private async handleLoginFail(email: string, ip: string) {
    // Đếm số lần fail trong ngày
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const countFailed = await this.userLogRepository
      .createQueryBuilder('log')
      .where('log.email = :email', { email })
      .andWhere('log.status = :status', { status: 'fail' })
      .andWhere('log.created_at BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .getCount();

    if (countFailed >= 5) {
      const lockIp = await this.ipLockRepository.findOne({ where: { ip_client: ip } });
      if (lockIp) {
        await this.ipLockRepository.update(lockIp.id, { lock_time: Math.floor(Date.now() / 1000) });
      } else {
        await this.ipLockRepository.save({ ip_client: ip, lock_time: Math.floor(Date.now() / 1000) });
      }
      throw new HttpException(
        { info: 'Bạn đã bị chặn truy cập, liên hệ quản trị viên để mở khóa.', alias: 'Error_Ip_Lock' },
        HttpStatus.NOT_ACCEPTABLE,
      );
    }

    throw new HttpException(
      { info: 'Tên đăng nhập hoặc mật khẩu không chính xác.', alias: 'Error_Invalid_Account' },
      HttpStatus.NOT_ACCEPTABLE,
    );
  }
}
