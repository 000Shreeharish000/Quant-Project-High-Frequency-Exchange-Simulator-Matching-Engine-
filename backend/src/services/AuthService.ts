import { v4 as uuidv4 } from "uuid";
import UserModel from "../models/User.js";
import { hashPassword, comparePassword, isStrongPassword } from "../utils/password.js";
import { generateToken } from "../utils/jwt.js";
import { storeSession, invalidateSession, validateSession as validateRedisSession } from "../utils/redis.js";
import config from "../config/index.js";

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    profile_picture_url?: string;
    auth_method: string;
  };
}

export class AuthService {
  static async register(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ): Promise<AuthResponse> {
    // Validate input
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Invalid email format");
    }

    if (!isStrongPassword(password)) {
      throw new Error("Password must be strong and include uppercase, lowercase, number, and symbol");
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const existingUser = await UserModel.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new Error("Email already registered");
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await UserModel.create({
      email: normalizedEmail,
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
      auth_method: "email",
    });

    // Generate token and session
    const tokenId = uuidv4();
    const accessToken = generateToken(
      {
        userId: user.id,
        email: user.email,
      },
      tokenId
    );

    // Store session in Redis
    await storeSession(user.id, tokenId, config.session.expiry);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        profile_picture_url: user.profile_picture_url,
        auth_method: user.auth_method,
      },
    };
  }

  static async login(email: string, password: string): Promise<AuthResponse> {
    // Validate input
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user
    const user = await UserModel.findByEmail(normalizedEmail);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Check if user has password (email auth method)
    if (!user.password_hash) {
      throw new Error("Invalid email or password");
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    // Generate token and session
    const tokenId = uuidv4();
    const accessToken = generateToken(
      {
        userId: user.id,
        email: user.email,
      },
      tokenId
    );

    // Store session in Redis
    await storeSession(user.id, tokenId, config.session.expiry);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        profile_picture_url: user.profile_picture_url,
        auth_method: user.auth_method,
      },
    };
  }

  static async googleAuth(profile: {
    id: string;
    displayName?: string;
    emails?: Array<{ value: string }>;
    photos?: Array<{ value: string }>;
  }): Promise<AuthResponse> {
    const googleId = profile.id;
    const email = profile.emails?.[0]?.value;
    const displayName = profile.displayName || "";
    const profilePictureUrl = profile.photos?.[0]?.value;
    const normalizedEmail = email.trim().toLowerCase();

    if (!email) {
      throw new Error("Email not provided by Google");
    }

    // Try to find existing user by Google ID
    let user = await UserModel.findByGoogleId(googleId);

    if (!user) {
      // Try to find existing user by email
      user = await UserModel.findByEmail(email);

      if (!user) {
        // Create new user
        const [firstName, lastName] = displayName.split(" ");
        user = await UserModel.create({
          email: normalizedEmail,
          google_id: googleId,
          first_name: firstName,
          last_name: lastName,
          auth_method: "google",
          profile_picture_url: profilePictureUrl,
        });
      } else {
        // Link Google ID to existing user
        user = await UserModel.update(user.id, {
          google_id: googleId,
          auth_method: "google",
          profile_picture_url: profilePictureUrl || user.profile_picture_url,
        });
      }
    }

    if (!user) {
      throw new Error("Failed to authenticate with Google");
    }

    // Generate token and session
    const tokenId = uuidv4();
    const accessToken = generateToken(
      {
        userId: user.id,
        email: user.email,
      },
      tokenId
    );

    // Store session in Redis
    await storeSession(user.id, tokenId, config.session.expiry);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        profile_picture_url: user.profile_picture_url,
        auth_method: user.auth_method,
      },
    };
  }

  static async logout(tokenId: string): Promise<void> {
    await invalidateSession(tokenId);
  }

  static async validateSession(tokenId: string, userId: string): Promise<boolean> {
    const storedUserId = await validateRedisSession(tokenId);
    return storedUserId === userId;
  }
}

export default AuthService;
