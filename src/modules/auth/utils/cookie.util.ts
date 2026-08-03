import type { Response } from 'express';
import { env } from '../../../config/env';

export interface CookieOptions {
  accessToken: string;
  refreshToken: string;
}

/**
 * Set secure HTTP-only cookies for authentication tokens
 * Implements: httpOnly, Secure, SameSite=Strict
 * @param res Express response object
 * @param tokens Object containing accessToken and refreshToken
 */
export function setAuthCookies(res: Response, tokens: CookieOptions): void {
  const isProduction = env.NODE_ENV === 'production';

  res.cookie('access_token', tokens.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refresh_token', tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export function setAccessTokenCookie(res: Response, accessToken: string): void {
  const isProduction = env.NODE_ENV === 'production';

  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
}

export function clearAuthCookies(res: Response): void {
  const isProduction = env.NODE_ENV === 'production';

  res.clearCookie('access_token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
  });

  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
  });
}
