/** Claims of the access token. `sub` is the user id. */
export interface AccessTokenPayload {
  sub: number;
}

/** Claims of the refresh token. `jti` makes every issued token unique before hashing. */
export interface RefreshTokenPayload {
  sub: number;
  jti: string;
}
