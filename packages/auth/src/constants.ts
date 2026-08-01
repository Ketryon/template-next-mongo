/** httpOnly cookie holding the nonce that binds a completion token to a browser. */
export const NONCE_COOKIE = "auth_completion_nonce";

/** The nonce only has to survive the round trip from verify to signIn. */
export const NONCE_MAX_AGE_SECONDS = 120;
