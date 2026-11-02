/** A numeric id out of a route segment; null when the URL carries anything else. */
export function idParam (value: string | string[] | undefined): number | null {
  const text = Array.isArray(value) ? value[0] : value;

  if (text === undefined || !/^[1-9]\d*$/.test(text)) {
    return null;
  }

  return Number(text);
}
