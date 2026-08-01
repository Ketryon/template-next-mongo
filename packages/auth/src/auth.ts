import { getOrCreateUserByEmail } from "@ketryon/db/auth";
import NextAuth from "next-auth";
// Imported so TypeScript resolves the module for the augmentation at the
// bottom of this file; without it, `declare module "next-auth/jwt"` fails.
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";

import { NONCE_COOKIE } from "./constants";
import { verifyCompletionToken } from "./completion-token";
import { env } from "./env";

/**
 * Auth.js v5 — provsvaret's configuration, ported.
 *
 * Structure kept deliberately identical to theirs:
 *   - a Credentials provider per identity method, each taking a completionToken
 *   - `authorize` verifies the token and resolves the user in MongoDB
 *   - JWT sessions, and the jwt/session callbacks copy ids onto the token
 *
 * Note that JWT is not a preference here — Auth.js does not persist sessions
 * created by the Credentials provider, so `strategy: "jwt"` is the only option
 * this design allows. The consequence is inherited too: a session cannot be
 * revoked before it expires. That is the price of the Credentials approach, and
 * it is why `maxAge` is a day rather than a month.
 *
 * Adding BankID later means adding one more Credentials provider beside the
 * email one — the shape is already here.
 */
export type { JWT };

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: "email",
      name: "Email",
      credentials: {
        completionToken: { label: "Completion Token", type: "text" },
      },
      async authorize(credentials) {
        const completionToken = credentials?.completionToken;
        if (typeof completionToken !== "string" || !completionToken) return null;

        // The nonce lives in an httpOnly cookie set when the code was verified.
        const jar = await cookies();
        const nonce = jar.get(NONCE_COOKIE)?.value;

        const verified = verifyCompletionToken(completionToken, "email", nonce);
        if (!verified) return null;

        const user = await getOrCreateUserByEmail(verified.subject);

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name ?? null,
          image: user.image ?? null,
          role: user.role,
        };
      },
    }),

    // Registered only when configured, so the template runs without OAuth set up.
    ...(env.github.id && env.github.secret ? [GitHub] : []),
    ...(env.google.id && env.google.secret ? [Google] : []),
  ],

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours, as in provsvaret
  },

  callbacks: {
    async jwt({ token, user, account }) {
      if (!user) return token;

      if (account?.provider === "credentials") {
        token.userId = user.id;
        token.role = user.role === "admin" ? "admin" : "user";
        return token;
      }

      // OAuth: Auth.js hands back the provider's id, which is meaningless to
      // the DAL. Resolve it to a real Mongo _id so `orders.userId` lines up.
      if (user.email) {
        const doc = await getOrCreateUserByEmail(user.email, {
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        });
        token.userId = doc._id.toString();
        token.role = doc.role === "admin" ? "admin" : "user";
      }

      return token;
    },

    async session({ session, token }) {
      if (token.userId) session.user.id = token.userId as string;
      session.user.role = (token.role as "user" | "admin" | undefined) ?? "user";
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  debug: process.env.NODE_ENV === "development",
});

declare module "next-auth" {
  interface User {
    role?: "user" | "admin";
  }

  interface Session {
    user: {
      id: string;
      role: "user" | "admin";
    } & import("next-auth").DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: "user" | "admin";
  }
}
