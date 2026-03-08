import express, { Express, Request, Response } from "express";
import cors from "cors";
import passport from "passport";
import config from "./config/index.js";
import { testConnection } from "./database/connection.js";
import { initRedis } from "./utils/redis.js";
import authRoutes from "./routes/auth.js";
import exchangeRoutes from "./exchange/routes/exchange.js";
import { generalLimiter } from "./middleware/rateLimit.js";

const app: Express = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  if (config.server.nodeEnv === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "256kb" }));

app.use(
  cors({
    origin: config.frontend.origins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(generalLimiter);
app.use(passport.initialize());

app.use("/auth", authRoutes);
app.use("/exchange", exchangeRoutes);

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "nexusx-exchange-simulator",
    timestamp: new Date().toISOString(),
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
  });
});

app.use((err: Error, _req: Request, res: Response) => {
  console.error(err);
  res.status(500).json({
    error: "Internal server error",
    message: config.server.nodeEnv === "development" ? err.message : undefined,
  });
});

async function startServer() {
  console.log("🚀 Starting NEXUSX Exchange Backend...");

  let dbStatus = "not_configured";
  let redisStatus = "not_configured";

  try {
    console.log("📊 Testing database connection...");
    const dbConnected = await testConnection();
    dbStatus = dbConnected ? "connected" : "unavailable";
  } catch (error) {
    dbStatus = "unavailable";
    console.warn("⚠️ Database unavailable. Exchange simulator still runs in-memory.", error);
  }

  try {
    console.log("💾 Initializing Redis connection...");
    await initRedis();
    redisStatus = "connected";
  } catch (error) {
    redisStatus = "unavailable";
    console.warn("⚠️ Redis unavailable. Session-backed auth may be degraded.", error);
  }

  app.listen(config.server.port, () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║   ✅ NEXUSX Exchange Simulator                      ║
║   🌐 API: http://localhost:${config.server.port}                          ║
║   📊 PostgreSQL: ${dbStatus.padEnd(33)}║
║   💾 Redis: ${redisStatus.padEnd(38)}║
║   🖥️ Frontend: ${config.frontend.url.padEnd(34)}║
╚══════════════════════════════════════════════════════╝
    `);
  });
}

process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  process.exit(0);
});

startServer();

export default app;
