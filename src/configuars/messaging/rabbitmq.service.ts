import { Injectable, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RabbitmqService {
  private readonly logger = new Logger(RabbitmqService.name);
  private readonly exchange: string;

  constructor(
    private readonly amqp: AmqpConnection,
    private readonly cfg: ConfigService,
  ) {
    this.exchange =
      this.cfg.get<string>('rabbitmq.exchange') ??
      'meta_social_exchange';
  }

  async publish(routingKey: string, payload: unknown) {
    this.logger.debug(`Publish ${routingKey}`);
  
    return this.amqp.publish(this.exchange, routingKey, payload, {
      persistent: true, // message lưu trên disk nếu queue durable
      contentType: 'application/json',
      // messageId, headers... tuỳ nhu cầu
    });
  }
}
