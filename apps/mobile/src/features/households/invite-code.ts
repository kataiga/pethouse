/** Invite codes are 12 base64url characters; the API is the authority on their validity. */
const CODE = /^[A-Za-z0-9_-]{6,64}$/;

/**
 * Extracts the code from what a person pasted: the bare code, the `pethouse://invite/<code>`
 * link, or any URL ending with `/invite/<code>`. Returns null when nothing looks like a code.
 */
export function inviteCodeFrom (input: string): string | null {
  const trimmed = input.trim();
  const fromLink = /\/invite\/([^/?#\s]+)/.exec(trimmed)?.[1];
  const candidate = fromLink ?? trimmed;

  return CODE.test(candidate) ? candidate : null;
}
