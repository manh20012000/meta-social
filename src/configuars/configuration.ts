export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.APP_PORT ?? process.env.PORT ?? '3000', 10),
  globalPrefix: process.env.GLOBAL_PREFIX ?? 'api',

    db: {
      mongoUri: process.env.MONGO_URI!, // ví dụ: mongodb+srv://...
      mongoDbName: process.env.MONGO_DB || 'meta-social',
    },


  // ƯU TIÊN URL, fallback host/port
  redis: {
    url: process.env.REDIS_URL,
  },

  rabbitmq: {
    uri: process.env.RABBITMQ_URI!,
    exchange: process.env.SOCIAL_RABBITMQ_EXCHANGE ?? 'meta_social_exchange',
  },
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || '',
    username: process.env.ELASTICSEARCH_USERNAME,
    api_key: process.env.ELASTICSEARCH_API_KEY,
  },
});
