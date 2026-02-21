import crypto from "crypto";

const sortKeysRecursively = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortKeysRecursively);
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => left.localeCompare(right),
    );
    return Object.fromEntries(entries.map(([key, inner]) => [key, sortKeysRecursively(inner)]));
  }

  return value;
};

export const createDeterministicSnapshot = (payload: unknown): string => {
  return JSON.stringify(sortKeysRecursively(payload));
};

export const sha256Hex = (value: string): string => {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
};
