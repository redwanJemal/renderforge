import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { config } from "../config.js";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  // Derive a 32-byte key from JWT_SECRET
  const key = Buffer.alloc(32);
  const secret = Buffer.from(config.JWT_SECRET);
  secret.copy(key, 0, 0, Math.min(secret.length, 32));
  return key;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  // Format: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const [ivHex, authTagHex, encrypted] = ciphertext.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
