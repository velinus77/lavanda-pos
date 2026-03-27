import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as cookie from 'cookie';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your-access-token-secret-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-token-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  userId: number;
  role: string;
}

export interface RefreshTokenPayload {
  userId: number;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate access and refresh tokens for a user
 */
export function generateTokens(userId: number, role: string): Tokens {
  const accessToken = jwt.sign(
    { userId, role },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { userId },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
}

/**
 * Verify and decode an access token
 */
export function verifyAccessToken(token: string): TokenPayload {
  const payload = jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
  return { userId: payload.userId, role: payload.role };
}

/**
 * Verify and decode a refresh token
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = jwt.verify(token, REFRESH_TOKEN_SECRET) as RefreshTokenPayload;
  return { userId: payload.userId };
}

/**
 * Parse cookies from a Cookie header string
 */
export function parseCookies(cookieHeader: string): Record<string, string> {
  return cookie.parse(cookieHeader);
}

/**
 * Create a secure cookie header for setting cookies
 */
export function createCookieHeader(name: string, value: string, maxAge: number): string {
  return cookie.serialize(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge,
    path: '/'
  });
}
