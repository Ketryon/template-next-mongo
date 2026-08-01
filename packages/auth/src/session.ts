import { UnauthorizedError, type Role, type Session } from "@ketryon/db";

import { auth } from "./auth";

/**
 * Bridge from Auth.js to the `Session` contract the DAL takes.
 *
 * This is the seam the template was built around: `packages/db` defines
 * `Session`, every DAL function accepts one, and nothing in the DAL knows what
 * produced it. Swapping auth libraries touches this file and nothing else.
 */
export async function getSession(): Promise<Session | null> {
  const result = await auth();
  if (!result?.user?.id) return null;

  // Narrow defensively: anything that is not exactly "admin" is a user.
  const role: Role = result.user.role === "admin" ? "admin" : "user";

  return { userId: result.user.id, role };
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}
