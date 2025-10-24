import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisDataService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(redisUrl?: string) {
    const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(url);
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const stringified = JSON.stringify(value);
    if (ttl) {
      await this.redis.set(key, stringified, 'PX', ttl);
    } else {
      await this.redis.set(key, stringified);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const values = await this.redis.mget(keys);
    return values.map((v) => (v ? (JSON.parse(v) as T) : null));
  }

  async geoRemove(key: string, member: string) {
    await this.redis.zrem(key, member);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
