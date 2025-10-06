import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './configuars/configuration';
import { AppRabbitmqModule } from './configuars/messaging/rabbitmq.module';
import { RedisModule } from './configuars/redis/redis.module';
import { ElasticsModule } from './configuars/elasticsearch/elasticsearch.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration], 
    }),
    AppRabbitmqModule,
    RedisModule,
    ElasticsModule,
  ],
})
export class AppModule {}
