import rateLimit from "express-rate-limit";
import config from "../config/index.js";

const defaultRateMessage = {
  success: false,
  error: "Too many requests, please try again later",
};

export const authLimiter = rateLimit({
  windowMs: config.rateLimit.authWindowMs,
  max: config.rateLimit.authMax,
  message: {
    success: false,
    error: "Too many authentication attempts, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalLimiter = rateLimit({
  windowMs: config.rateLimit.generalWindowMs,
  max: config.rateLimit.generalMax,
  message: defaultRateMessage,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/health",
});

export default {
  authLimiter,
  generalLimiter,
};
