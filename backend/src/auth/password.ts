import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const keyLength = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, keyLength)) as Buffer;

  return `scrypt:${salt.toString("base64")}:${derivedKey.toString("base64")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string | null
): Promise<boolean> {
  if (!storedHash) {
    return false;
  }
  const [algorithm, saltEncoded, hashEncoded] = storedHash.split(":");

  if (algorithm !== "scrypt" || !saltEncoded || !hashEncoded) {
    return false;
  }

  const salt = Buffer.from(saltEncoded, "base64");
  const storedKey = Buffer.from(hashEncoded, "base64");
  const suppliedKey = (await scrypt(password, salt, storedKey.length)) as Buffer;

  return (
    storedKey.length === suppliedKey.length &&
    timingSafeEqual(storedKey, suppliedKey)
  );
}
