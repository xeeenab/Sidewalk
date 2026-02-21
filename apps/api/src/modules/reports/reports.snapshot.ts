import crypto from "crypto";

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => left.localeCompare(right),
    );
    return Object.fromEntries(entries.map(([key, inner]) => [key, canonicalize(inner)]));
  }

  return value;
};

export const buildDeterministicSnapshot = (payload: unknown): string => {
  return JSON.stringify(canonicalize(payload));
};

export const hashSnapshot = (snapshot: string): string => {
  return crypto.createHash("sha256").update(snapshot, "utf8").digest("hex");
};
