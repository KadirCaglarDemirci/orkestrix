export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
  JWT_SECRET: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "7d",
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ?? "12345678901234567890123456789012",
  API_PORT: parseInt(process.env.API_PORT ?? "3001", 10),
  API_HOST: process.env.API_HOST ?? "0.0.0.0",
  WEBHOOK_BASE_URL: process.env.WEBHOOK_BASE_URL ?? "http://localhost:3001",
};
