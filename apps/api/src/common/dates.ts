/** Today as a calendar date (`YYYY-MM-DD`) in UTC: the server has no idea of the user's local day. */
export function todayIsoDate (): string {
  return new Date().toISOString().slice(0, 10);
}
