import type { Env } from "../config/env.js";

/** Cookie attributes shared by the trusted-device flow. */
export function trustedDeviceCookieName(env: Env): string {
  return env.TRUSTED_DEVICE_COOKIE_NAME;
}

export function trustedDeviceCookieOptions(env: Env) {
  return {
    httpOnly: true,
    sameSite: env.NODE_ENV === "production" ? "none" as const : "lax" as const,
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: env.TRUSTED_DEVICE_TTL_DAYS * 24 * 60 * 60
  };
}
