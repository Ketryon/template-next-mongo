/**
 * The contract between your auth provider and the data layer.
 *
 * This package is deliberately auth-agnostic: it does not know or care whether
 * sessions come from Auth.js, Better Auth, Clerk or a custom cookie. The app
 * resolves a Session and hands it to a DAL function.
 *
 * The important part is the *shape*. Every DAL function takes a `Session`, never
 * a bare `userId` — an identity that arrives as a plain argument is an identity
 * the caller chose for themselves.
 */
export type Role = "user" | "admin";

export interface Session {
  /** 24-char hex ObjectId of the acting user. */
  userId: string;
  role: Role;
}
