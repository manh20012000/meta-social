// src/config/elasticsearch.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { ElasticsearchModule } from '@nestjs/elasticsearch';

import { UserElasticsearchService } from './user-search.service';

@Module({
  imports: [
    ConfigModule,
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const node = cfg.get<string>('elasticsearch.node'); // ví dụ: https://<host>:9200
        const username = cfg.get<string>('elasticsearch.username');
        const apiKey = cfg.get<string>('elasticsearch.api_key');
        if (!node) throw new Error('Missing es.node');

        return {
          node,
          auth: apiKey ? { apiKey } : undefined,
          // tls: { rejectUnauthorized: false },
        };
      },
    }),
  ],
  providers: [UserElasticsearchService],
  exports: [UserElasticsearchService],
})
export class ElasticsModule {}
