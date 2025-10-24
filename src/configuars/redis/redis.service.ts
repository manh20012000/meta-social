import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisPubSubService implements OnModuleDestroy {
  public publisher: Redis;
  public subscriber: Redis;

  constructor(redisUrl?: string) {
    const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    this.publisher = new Redis(url);
    this.subscriber = new Redis(url);

    this.subscriber.on('connect', () => {
      console.log('[RedisSub] Subscriber connected');
    });

    this.publisher.on('connect', () => {
      console.log('[RedisPub] Publisher connected');
    });
  }

  async publish(channel: string, data: any): Promise<void> {
    try {
      const payload = JSON.stringify(data);
      await this.publisher.publish(channel, payload);
    } catch (error) {
      console.error(
        `[RedisPubSub] Failed to publish message to ${channel}:`,
        error,
      );
    }
  }

  async subscribe(
    channel: string,
    handler: (message: any) => void,
  ): Promise<void> {
    await this.subscriber.subscribe(channel);

    this.subscriber.on('message', (subChannel, message) => {
      if (subChannel === channel) {
        try {
          const parsed = JSON.parse(message);
          handler(parsed);
        } catch (e) {
          console.error(
            `[RedisPubSub] Failed to parse message from ${channel}:`,
            message,
          );
        }
      }
    });
  }

  async onModuleDestroy() {
    await this.publisher.quit();
    await this.subscriber.quit();
  }
}
