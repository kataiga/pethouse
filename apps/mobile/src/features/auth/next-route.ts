/**
 * Where to go after signing in. Only in-app paths are accepted, so a crafted link cannot send
 * the person anywhere else; anything doubtful falls back to the start.
 */
export function safeNextRoute (next: string | string[] | undefined): string {
  const value = Array.isArray(next) ? next[0] : next;

  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('://')) {
    return '/';
  }

  return value;
}
