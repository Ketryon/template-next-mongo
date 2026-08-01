import { collections } from "../collections";
import { NotFoundError } from "../errors";
import { toUserDTO, userInput, type UserDTO } from "../schemas/user";
import { toObjectId } from "../schemas/shared";
import type { Session } from "../session";

/**
 * Session-scoped reads and writes of the current user.
 *
 * Account *creation* is not here — that happens before a session exists and
 * lives in `@ketryon/db/auth`, which only the auth package may import. Note
 * also that `role` has no write path from this layer: a user cannot promote
 * themselves through their own profile update.
 */

export async function getCurrentUser(session: Session): Promise<UserDTO> {
  const doc = await collections.users().findOne({
    _id: toObjectId(session.userId, "session user"),
  });

  if (!doc) throw new NotFoundError("User");
  return toUserDTO(doc);
}

export async function updateCurrentUser(
  session: Session,
  patch: { name: string },
): Promise<UserDTO> {
  const { name } = userInput.parse(patch);

  const doc = await collections.users().findOneAndUpdate(
    { _id: toObjectId(session.userId, "session user") },
    { $set: { name, updatedAt: new Date() } },
    { returnDocument: "after" },
  );

  if (!doc) throw new NotFoundError("User");
  return toUserDTO(doc);
}
