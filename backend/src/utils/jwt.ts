import jwt from "jsonwebtoken";
import config from "../config/index.js";

export interface TokenPayload {
  userId: string;
  email: string;
  tokenId: string;
}

export function generateToken(payload: Omit<TokenPayload, "tokenId">, tokenId: string): string {
  return jwt.sign(
    {
      ...payload,
      tokenId,
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiry,
    }
  );
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, config.jwt.secret) as TokenPayload;
    return payload;
  } catch (error) {
    return null;
  }
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.decode(token) as TokenPayload | null;
    return payload;
  } catch {
    return null;
  }
}
