import type { HeaderPair } from "./types";

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH"]);
const PLACEHOLDER_PATTERN = /{{\s*([A-Za-z0-9_.-]+)\s*}}/g;
const AUTHORITY_PLACEHOLDER_PATTERN = /{{\s*[A-Za-z0-9_.-]+\s*}}/;

export function assertAllowedMethod(method: string | undefined): void {
  if (!method || !ALLOWED_METHODS.has(method.toUpperCase())) {
    throw new SecurityValidationError("Method must be GET, POST, PUT, or PATCH");
  }
}

export function assertSafeUpstreamUrl(rawUrl: string, allowedHostsList?: string): void {
  assertNoAuthorityPlaceholders(rawUrl);
  let url: URL;
  try {
    url = new URL(maskPlaceholders(rawUrl));
  } catch {
    throw new SecurityValidationError("Target URL must be an absolute HTTPS URL");
  }
  if (url.protocol !== "https:") {
    throw new SecurityValidationError("Upstream URL must use https");
  }

  const hostname = stripIpv6Brackets(url.hostname.toLowerCase());
  if (isBlockedHostname(hostname)) {
    throw new SecurityValidationError("Upstream host is not allowed");
  }

  const allowedHosts = parseList(allowedHostsList);
  if (allowedHosts.length > 0 && !matchesAllowedHost(hostname, allowedHosts)) {
    throw new SecurityValidationError("Upstream host is not in the allowed host list");
  }
}

function assertNoAuthorityPlaceholders(rawUrl: string): void {
  const authority = rawUrl.trim().match(/^[A-Za-z][A-Za-z0-9+.-]*:\/\/([^/?#]*)/)?.[1] ?? "";
  if (AUTHORITY_PLACEHOLDER_PATTERN.test(authority)) {
    throw new SecurityValidationError("URL placeholders are only allowed in the path or query string, not the scheme, host, port, username, or password");
  }
}

export function assertStaticHeadersAreSafe(headers: HeaderPair[] | undefined): void {
  for (const header of headers ?? []) {
    const name = header.name.trim();
    if (!name) continue;
    if (isSensitiveHeaderName(name) || !isAllowedStaticHeaderName(name)) {
      throw new SecurityValidationError(
        `Static header "${name}" is not allowed. Use pass-through headers for credentials.`,
      );
    }
  }
}

export function assertBodyTemplateDoesNotStoreSecrets(bodyTemplate: string | undefined): void {
  const body = bodyTemplate?.trim();
  if (!body) return;

  if (/(api[_-]?key|access[_-]?token|auth[_-]?token|authorization|client[_-]?secret|secret|password|bearer)\s*["']?\s*[:=]/i.test(body)) {
    throw new SecurityValidationError("Body template appears to contain a credential. Use runtime headers or URL placeholders instead.");
  }

  if (/bearer\s+[A-Za-z0-9._~+/-]{12,}/i.test(body)) {
    throw new SecurityValidationError("Body template appears to contain a bearer token. Use runtime headers instead.");
  }
}

export function isCrossHostNext(originalTargetUrl: string, nextUrl: string): boolean {
  const original = new URL(maskPlaceholders(originalTargetUrl));
  const next = new URL(nextUrl, original);
  return next.host.toLowerCase() !== original.host.toLowerCase();
}

export function isCallerIpAllowed(ip: string | null, allowedCidrsList?: string): boolean {
  const cidrs = parseList(allowedCidrsList);
  if (cidrs.length === 0) return true;
  if (!ip) return false;

  return cidrs.some((cidr) => matchesCidr(ip, cidr));
}

export function isSensitiveHeaderName(name: string): boolean {
  return /(authorization|proxy-authorization|cookie|set-cookie|api[-_]?key|apikey|token|secret|credential|password|session|signature|x-rapidapi-key|x-functions-key|x-goog-api-key|private-token)/i.test(
    name.trim(),
  );
}

function isAllowedStaticHeaderName(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  if (/^(accept|accept-language|content-type|user-agent|prefer|api-version|x-api-version|x-client-version|x-requested-with)$/.test(normalized)) {
    return true;
  }

  return /^x-[a-z0-9-]*(version|client|source|integration)[a-z0-9-]*$/.test(normalized);
}

function maskPlaceholders(rawUrl: string): string {
  return rawUrl.replace(PLACEHOLDER_PATTERN, "placeholder");
}

function isBlockedHostname(hostname: string): boolean {
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "metadata.google.internal"
  ) {
    return true;
  }

  if (
    hostname.includes(":") &&
    (hostname === "::1" || hostname === "0:0:0:0:0:0:0:1" || hostname.startsWith("fc") || hostname.startsWith("fd") || hostname.startsWith("fe80"))
  ) {
    return true;
  }

  const octets = parseIpv4(hostname);
  if (!octets) return false;
  const [first, second] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function parseIpv4(value: string): number[] | null {
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((part) => Number(part));
  if (octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return octets;
}

function stripIpv6Brackets(hostname: string): string {
  return hostname.replace(/^\[/, "").replace(/\]$/, "");
}

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function matchesAllowedHost(hostname: string, allowedHosts: string[]): boolean {
  return allowedHosts.some((allowed) => {
    if (allowed.startsWith("*.")) {
      const suffix = allowed.slice(1);
      return hostname.endsWith(suffix) && hostname !== allowed.slice(2);
    }
    return hostname === allowed;
  });
}

function matchesCidr(ip: string, cidr: string): boolean {
  if (!cidr.includes("/")) {
    return ip === cidr;
  }

  const [range, prefixText] = cidr.split("/");
  const prefix = Number(prefixText);
  const ipInt = ipv4ToInt(ip);
  const rangeInt = ipv4ToInt(range);
  if (ipInt === null || rangeInt === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return false;
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

function ipv4ToInt(ip: string): number | null {
  const octets = parseIpv4(ip);
  if (!octets) return null;
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

export class SecurityValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecurityValidationError";
  }
}
