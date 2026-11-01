/** `%` and `_` are wildcards in SQL LIKE; a user-supplied search term must not smuggle them in. */
export function escapeLike (value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** `%term%` with the term escaped. */
export function containsPattern (term: string): string {
  return `%${escapeLike(term)}%`;
}
