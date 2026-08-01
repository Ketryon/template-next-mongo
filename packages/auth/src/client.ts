"use client";

/**
 * Browser-side auth surface.
 *
 * A separate entry point (`@ketryon/auth/client`) from the server instance,
 * which is `server-only` — importing the wrong one is a build error rather than
 * a leaked secret.
 */
export { signIn, signOut, useSession, SessionProvider } from "next-auth/react";
