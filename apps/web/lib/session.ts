import "server-only";
import { cookies } from "next/headers";
import { UnauthorizedError, type Role, type Session } from "@ketryon/db";

/**
 * TEMPLATE STUB — replace with your auth provider (Auth.js, Better Auth, Clerk).
 *
 * The only contract the data layer cares about is that this returns a trusted
 * `Session`. Resolve it from a verified cookie/JWT here; everything downstream
 * derives identity from the return value.
 *
 * Note what is *not* here: no auth in `middleware.ts`. Middleware is for
 * redirects. Authorisation lives in the DAL, below every entry point, so a
 * bypassed edge layer cannot reach data.
 */
export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const userId = jar.get("uid")?.value;
  const role = (jar.get("role")?.value ?? "user") as Role;

  if (userId) return { userId, role };

  // Dev convenience only, so the template runs before auth is wired.
  if (process.env.NODE_ENV !== "production" && process.env.DEV_SESSION_USER_ID) {
    return {
      userId: process.env.DEV_SESSION_USER_ID,
      role: (process.env.DEV_SESSION_ROLE as Role) ?? "user",
    };
  }

  return null;
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}
