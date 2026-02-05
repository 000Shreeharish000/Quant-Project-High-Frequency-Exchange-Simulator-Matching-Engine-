import { createClient, RedisClientType } from "redis";
import config from "../config/index.js";

let redisClient: RedisClientType | null = null;

export async function initRedis(): Promise<RedisClientType> {
  if (redisClient) {
    return redisClient;
  }

  redisClient = createClient({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
  }) as any;

  redisClient.on("error", (err) => console.error("Redis error:", err));
  redisClient.on("connect", () => console.log("✅ Redis connected"));

  await redisClient.connect();
  return redisClient;
}

export async function getRedis(): Promise<RedisClientType> {
  if (!redisClient) {
    return initRedis();
  }
  return redisClient;
}

export async function storeSession(
  userId: string,
  tokenId: string,
  ttl: number = config.session.expiry
) {
  const redis = await getRedis();
  const key = `session:${tokenId}`;
  await redis.setEx(key, ttl, userId);
}

export async function validateSession(tokenId: string): Promise<string | null> {
  const redis = await getRedis();
  const key = `session:${tokenId}`;
  return redis.get(key);
}

export async function invalidateSession(tokenId: string): Promise<void> {
  const redis = await getRedis();
  const key = `session:${tokenId}`;
  await redis.del(key);
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

export default {
  initRedis,
  getRedis,
  storeSession,
  validateSession,
  invalidateSession,
  closeRedis,
};
