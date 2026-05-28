export function getByPath(value: unknown, path: string | undefined): unknown {
  if (!path || path.trim() === "" || path.trim() === "$") {
    return value;
  }

  const parts = tokenizePath(path.trim());
  let current: unknown = value;

  for (const part of parts) {
    if (current == null) {
      return undefined;
    }

    if (Array.isArray(current) && typeof part === "number") {
      current = current[part];
      continue;
    }

    if (typeof current === "object" && typeof part === "string") {
      current = (current as Record<string, unknown>)[part];
      continue;
    }

    return undefined;
  }

  return current;
}

export function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null) {
    return [];
  }

  return [value];
}

function tokenizePath(path: string): Array<string | number> {
  const normalized = path.startsWith("$.") ? path.slice(2) : path.replace(/^\$/, "");
  const parts: Array<string | number> = [];
  let buffer = "";

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (char === ".") {
      pushBuffer(parts, buffer);
      buffer = "";
      continue;
    }

    if (char === "[") {
      pushBuffer(parts, buffer);
      buffer = "";
      const close = normalized.indexOf("]", index);
      if (close === -1) {
        throw new Error(`Invalid path "${path}": missing closing bracket`);
      }

      const raw = normalized.slice(index + 1, close).trim();
      if (/^\d+$/.test(raw)) {
        parts.push(Number(raw));
      } else {
        parts.push(raw.replace(/^['"]|['"]$/g, ""));
      }
      index = close;
      continue;
    }

    buffer += char;
  }

  pushBuffer(parts, buffer);
  return parts;
}

function pushBuffer(parts: Array<string | number>, buffer: string): void {
  if (buffer !== "") {
    parts.push(buffer);
  }
}
