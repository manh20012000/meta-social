import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { RedisDataService } from '../redis/redis-data.service';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly jwtSecret: string;

  constructor(
    private configService: ConfigService,
    private redisService: RedisDataService,
  ) {
    this.jwtSecret = this.configService.get('JWT_SECRET') || 'your-secret';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 👇 Dành cho HTTP request
    const request = context.switchToHttp().getRequest();
    const token =
      request.headers['authorization'] ||
      request.headers['Authorization'];

    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    try {
      const auth = token.replace('Bearer ', '');
      const decoded = jwt.verify(auth, this.jwtSecret);

      // Lấy thông tin user từ Redis
      const userRaw = await this.redisService.get(`user:${auth}`);
      if (!userRaw) {
        throw new UnauthorizedException('Invalid token in redis');
      }

      // 👇 Gắn user vào request để controller sử dụng
      request.user = userRaw;

      return true;
    } catch (err) {
      console.error('AuthGuard error:', err);
      throw new UnauthorizedException('Token invalid');
    }
  }
}
