import { Router } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import AuthController from "../controllers/AuthController.js";
import { authMiddleware } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";
import AuthService from "../services/AuthService.js";
import config from "../config/index.js";

const router = Router();

// Configure Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackUrl,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const authResult = await AuthService.googleAuth({
          id: profile.id,
          displayName: profile.displayName,
          emails: profile.emails,
          photos: profile.photos,
        });
        return done(null, { authResult });
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

// Auth routes

/**
 * POST /auth/register
 * Register with email and password
 */
router.post("/register", authLimiter, async (req, res) => {
  AuthController.register(req, res);
});

/**
 * POST /auth/login
 * Login with email and password
 */
router.post("/login", authLimiter, async (req, res) => {
  AuthController.login(req, res);
});

/**
 * POST /auth/logout
 * Logout (requires authentication)
 */
router.post("/logout", authMiddleware, async (req, res) => {
  AuthController.logout(req, res);
});

/**
 * GET /auth/me
 * Get current user profile (requires authentication)
 */
router.get("/me", authMiddleware, async (req, res) => {
  AuthController.me(req, res);
});

/**
 * GET /auth/google
 * Initiate Google OAuth flow
 */
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

/**
 * GET /auth/google/callback
 * Google OAuth callback
 */
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  (req: any, res) => {
    // Attach auth result to request
    if (req.user && req.user.authResult) {
      req.authResult = req.user.authResult;
    }
    AuthController.googleCallback(req, res);
  }
);

export default router;
