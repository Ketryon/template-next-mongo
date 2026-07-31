import { z } from "zod";
import { objectId, timestamps } from "./shared";

/**
 * Three shapes per entity, and they are not the same shape:
 *
 *   Input — what an untrusted caller may send
 *   Doc   — what is actually stored (ObjectId, Date — no lying about types)
 *   DTO   — what leaves the data layer (serialisable, field-whitelisted)
 */

export const userInput = z.object({
  email: z.email(),
  name: z.string().min(1).max(120),
});
export type UserInput = z.infer<typeof userInput>;

export const userDoc = userInput.extend({
  _id: objectId,
  role: z.enum(["user", "admin"]),
  // Present in the document, absent from the DTO. That asymmetry is the point.
  passwordHash: z.string(),
  ...timestamps,
});
export type UserDoc = z.infer<typeof userDoc>;

/**
 * Explicit whitelist rather than a generic recursive serialiser: adding a
 * secret to `userDoc` must not silently start shipping it to the browser.
 */
export function toUserDTO(doc: UserDoc) {
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    role: doc.role,
    createdAt: doc.createdAt.toISOString(),
  };
}
export type UserDTO = ReturnType<typeof toUserDTO>;
