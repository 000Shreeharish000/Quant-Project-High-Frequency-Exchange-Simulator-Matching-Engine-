import express, { Express, Request, Response } from "express";
import cors from "cors";
import passport from "passport";
import config from "./config/index.js";
import { testConnection } from "./database/connection.js";
import { initRedis } from "./utils/redis.js";
import authRoutes from "./routes/auth.js";
import { generalLimiter } from "./middleware/rateLimit.js";

const app: Express = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(
  cors({
    origin: [config.frontend.url, "http://localhost:3000", "http://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate limiting
app.use(generalLimiter);

// Passport initialization (for Google OAuth)
app.use(passport.initialize());

// Routes
app.use("/auth", authRoutes);

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
  });
});

// Error handler
app.use((err: any, req: Request, res: Response) => {
  console.error(err);
  res.status(500).json({
    error: "Internal server error",
    message: config.server.nodeEnv === "development" ? err.message : undefined,
  });
});

// Initialize server
async function startServer() {
  try {
    console.log("🚀 Starting NEXUSX Authentication Service...");

    // Test database connection
    console.log("📊 Testing database connection...");
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error("Database connection failed");
    }

    // Initialize Redis
    console.log("💾 Initializing Redis connection...");
    await initRedis();

    // Start server
    app.listen(config.server.port, () => {
      console.log(`
╔════════════════════════════════════════════╗
║   ✅ NEXUSX Authentication Service        ║
║   🔐 Running on http://localhost:${config.server.port}      ║
║   📊 Database: Connected                  ║
║   💾 Redis: Connected                     ║
║   🌐 Frontend: ${config.frontend.url}         ║
╚════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  process.exit(0);
});

startServer();

export default app;
