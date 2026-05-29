const TOKEN_PREFIX = "cpr";

export interface EncryptedRunnerToken {
  tokenHash: string;
  tokenCiphertext: string;
  tokenIv: string;
}

export function generateRunnerToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `${TOKEN_PREFIX}_${base64UrlEncode(bytes)}`;
}

export async function encryptRunnerToken(token: string, encryptionKey: string): Promise<EncryptedRunnerToken> {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const key = await importAesKey(encryptionKey);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(token),
  );

  return {
    tokenHash: await hashRunnerToken(token),
    tokenCiphertext: base64UrlEncode(new Uint8Array(ciphertext)),
    tokenIv: base64UrlEncode(iv),
  };
}

export async function decryptRunnerToken(ciphertext: string, iv: string, encryptionKey: string): Promise<string> {
  const key = await importAesKey(encryptionKey);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlDecode(iv) },
    key,
    base64UrlDecode(ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}

export async function verifyRunnerToken(providedToken: string, expectedHash: string): Promise<boolean> {
  const providedHash = await hashRunnerToken(providedToken);
  return constantTimeEqual(providedHash, expectedHash);
}

async function hashRunnerToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return base64UrlEncode(new Uint8Array(digest));
}

async function importAesKey(secret: string): Promise<CryptoKey> {
  const keyBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function constantTimeEqual(left: string, right: string): boolean {
  const maxLength = Math.max(left.length, right.length);
  let diff = left.length === right.length ? 0 : 1;
  for (let index = 0; index < maxLength; index += 1) {
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return diff === 0;
}
