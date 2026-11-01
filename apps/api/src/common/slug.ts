/** `Eau noire / Blackwater` -> `eau-noire-blackwater`. ASCII only, at most `maxLength` chars. */
export function slugify (value: string, maxLength = 40): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}
