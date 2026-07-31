import { collections } from "../collections";
import { NotFoundError } from "../errors";
import { toUserDTO, type UserDTO } from "../schemas/user";
import { toObjectId } from "../schemas/shared";
import type { Session } from "../session";

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
  const doc = await collections.users().findOneAndUpdate(
    { _id: toObjectId(session.userId, "session user") },
    { $set: { name: patch.name, updatedAt: new Date() } },
    { returnDocument: "after" },
  );

  if (!doc) throw new NotFoundError("User");
  return toUserDTO(doc);
}
