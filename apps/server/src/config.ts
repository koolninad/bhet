const env = process.env;

export const config = {
  port: parseInt(env.PORT || "3100", 10),
  databaseUrl: env.DATABASE_URL || "postgresql://ninad@localhost:5432/bhet",
  redisUrl: env.REDIS_URL || "redis://localhost:6379",
  jwtSecret: env.JWT_SECRET || "dev-jwt-secret-change-in-production",

  liveKit: {
    url: env.LIVEKIT_URL || "http://192.168.0.215:7880",
    apiKey: env.LIVEKIT_API_KEY || "devkey",
    apiSecret: env.LIVEKIT_API_SECRET || "devsecret",
  },

  whisper: {
    url: env.WHISPER_URL || "http://localhost:9000/v1/audio/transcriptions",
  },

  recordingsDir: env.RECORDINGS_DIR || "./recordings",
};
