import { createHash, randomBytes } from "node:crypto";

/** A bearer token kept only in the client's HttpOnly cookie. */
export function createTrustedDeviceToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashTrustedDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
