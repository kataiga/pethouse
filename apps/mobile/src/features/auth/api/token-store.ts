/** Where the refresh token survives restarts. The access token never leaves memory. */
export interface TokenStore {
  read (): Promise<string | null>;
  write (refreshToken: string): Promise<void>;
  clear (): Promise<void>;
}
