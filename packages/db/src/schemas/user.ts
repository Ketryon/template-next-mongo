import { z } from "zod";
import { objectId, timestamps } from "./shared";

/**
 * Three shapes per entity, and they are not the same shape:
 *
 *   Input — what an untrusted caller may send
 *   Doc   — what is actually stored (ObjectId, Date — no lying about types)
 *   DTO   — what leaves the data layer (serialisable, field-whitelisted)
 *
 * Shaped for the email-code flow ported from provsvaret: there is no password,
 * so there is no password hash. A user is created by proving control of an
 * inbox, and everything else about them is filled in later — which is why every
 * field but `email` is optional.
 */

export const userInput = z.object({
  name: z.string().min(1).max(120),
});
export type UserInput = z.infer<typeof userInput>;

export const userDoc = z.object({
  _id: objectId,
  email: z.string(),
  name: z.string().optional(),
  image: z.string().optional(),
  /** Not settable by the user. Only ever written server-side. */
  role: z.enum(["user", "admin"]).default("user"),
  ...timestamps,
});
export type UserDoc = z.infer<typeof userDoc>;

/**
 * Explicit whitelist rather than a generic recursive serialiser: adding a
 * sensitive field to `userDoc` must not silently start shipping it to the
 * browser.
 */
export function toUserDTO(doc: UserDoc) {
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name ?? null,
    image: doc.image ?? null,
    role: doc.role,
    createdAt: doc.createdAt.toISOString(),
  };
}
export type UserDTO = ReturnType<typeof toUserDTO>;
