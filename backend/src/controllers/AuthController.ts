import { Response } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../middleware/auth.js";
import AuthService from "../services/AuthService.js";
import UserModel from "../models/User.js";
import config from "../config/index.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export class AuthController {
  static async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: "Invalid registration payload" });
        return;
      }

      const { email, password, firstName, lastName } = parsed.data;

      const result = await AuthService.register(email, password, firstName, lastName);

      res.status(201).json({
        success: true,
        message: "Registration successful",
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || "Registration failed",
      });
    }
  }

  static async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: "Invalid login payload" });
        return;
      }

      const { email, password } = parsed.data;

      const result = await AuthService.login(email, password);

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: result,
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        error: error.message || "Login failed",
      });
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      await AuthService.logout(req.user.tokenId);

      res.status(200).json({
        success: true,
        message: "Logout successful",
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || "Logout failed",
      });
    }
  }

  static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const user = await UserModel.getUserProfile(req.user.userId);

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || "Failed to fetch profile",
      });
    }
  }

  static async googleCallback(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Google authentication failed" });
        return;
      }

      const authResult = (req as any).authResult;

      if (!authResult) {
        res.status(401).json({ error: "Failed to complete Google authentication" });
        return;
      }

      res.redirect(
        `${config.frontend.url}/trade?token=${authResult.accessToken}&user=${encodeURIComponent(JSON.stringify(authResult.user))}`
      );
    } catch {
      res.redirect(`${config.frontend.url}/login?error=google_auth_failed`);
    }
  }
}

export default AuthController;
