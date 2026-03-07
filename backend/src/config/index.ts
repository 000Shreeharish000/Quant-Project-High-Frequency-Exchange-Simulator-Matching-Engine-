import dotenv from "dotenv";

dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";

if (nodeEnv === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production");
}

const frontendOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const config = {
  server: {
    port: parseInt(process.env.PORT || "5000", 10),
    nodeEnv,
  },
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    name: process.env.DB_NAME || "nexusx_exchange",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || "50", 10),
    idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT_MS || "30000", 10),
    connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || "10000", 10),
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD,
  },
  jwt: {
    secret: process.env.JWT_SECRET || "your-secret-key",
    expiry: process.env.JWT_EXPIRY || "24h",
  },
  auth: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "12", 10),
    passwordPepper: process.env.PASSWORD_PEPPER || "",
    minPasswordLength: parseInt(process.env.MIN_PASSWORD_LENGTH || "10", 10),
  },
  rateLimit: {
    authWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || `${15 * 60 * 1000}`, 10),
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || "10", 10),
    generalWindowMs: parseInt(process.env.GENERAL_RATE_LIMIT_WINDOW_MS || `${60 * 1000}`, 10),
    generalMax: parseInt(process.env.GENERAL_RATE_LIMIT_MAX || "300", 10),
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/auth/google/callback",
  },
  frontend: {
    url: process.env.FRONTEND_URL || "http://localhost:5173",
    origins: frontendOrigins,
  },
  session: {
    expiry: parseInt(process.env.SESSION_EXPIRY || "86400", 10),
  },
};

export default config;
