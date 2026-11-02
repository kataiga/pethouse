/** Mirrors the API's bound on an inhabitant's quantity. */
export const MAX_QUANTITY = 10_000;

/** A whole number from 1 to 10 000, or null for anything else. */
export function parseQuantity (text: string): number | null {
  const trimmed = text.trim();

  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const value = Number(trimmed);

  return value >= 1 && value <= MAX_QUANTITY ? value : null;
}
