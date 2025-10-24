import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisPubSubService } from './redis.service';
import { RedisDataService } from './redis-data.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: RedisPubSubService,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const redisUrl = cfg.get<string>('redis.url') || 'redis://localhost:6379';
        return new RedisPubSubService(redisUrl);
      },
    },
    {
      provide: RedisDataService,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const redisUrl = cfg.get<string>('redis.url') || 'redis://localhost:6379';
        return new RedisDataService(redisUrl);
      },
    },
  ],
  exports: [RedisPubSubService, RedisDataService],
})
export class RedisModule {}
