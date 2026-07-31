import { z } from "zod";
import { ObjectId } from "mongodb";
import { ValidationError } from "../errors";

/** An actual BSON ObjectId — what lives in a document. */
export const objectId = z.custom<ObjectId>(
  (v) => v instanceof ObjectId,
  "Expected an ObjectId",
);

/** A 24-char hex id — what arrives over the wire. */
export const objectIdString = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

/**
 * Parse an untrusted id into an ObjectId.
 *
 * `new ObjectId(userInput)` throws a driver error that would surface as a 500;
 * this turns a malformed id into the 400 it actually is.
 */
export function toObjectId(value: string, what = "id"): ObjectId {
  if (!objectIdString.safeParse(value).success) {
    throw new ValidationError(`Invalid ${what}`);
  }
  return new ObjectId(value);
}

/** Fields every document carries. Spread into each doc schema. */
export const timestamps = {
  createdAt: z.date(),
  updatedAt: z.date(),
};
