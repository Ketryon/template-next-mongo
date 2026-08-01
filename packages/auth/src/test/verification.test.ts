import { beforeEach, describe, expect, it } from "vitest";

import {
  consumeVerificationCode,
  getOrCreateUserByEmail,
  storeVerificationCode,
} from "@ketryon/db/auth";
import { collections } from "../../../db/src/collections";
import { syncIndexes } from "../../../db/src/indexes";
import { generateCode } from "../verification";

beforeEach(async () => {
  await collections.verificationCodes().deleteMany({});
  await collections.users().deleteMany({});
});

describe("verification codes", () => {
  it("generates a six-digit code", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateCode()).toMatch(/^\d{6}$/);
    }
  });

  it("accepts the right code exactly once", async () => {
    await storeVerificationCode("alice@test.dev", "123456");

    expect(await consumeVerificationCode("alice@test.dev", "123456")).toEqual({
      valid: true,
    });
    // Replay must fail — the record is deleted on success.
    expect(
      (await consumeVerificationCode("alice@test.dev", "123456")).valid,
    ).toBe(false);
  });

  it("normalises the email on both sides", async () => {
    await storeVerificationCode("  Alice@Test.DEV ", "123456");
    expect(
      (await consumeVerificationCode("alice@test.dev", "123456")).valid,
    ).toBe(true);
  });

  it("locks out after 5 wrong attempts", async () => {
    await storeVerificationCode("alice@test.dev", "123456");

    for (let i = 0; i < 5; i++) {
      expect((await consumeVerificationCode("alice@test.dev", "000000")).valid).toBe(
        false,
      );
    }

    // Even the correct code is refused once the budget is spent.
    const result = await consumeVerificationCode("alice@test.dev", "123456");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Too many attempts");
  });

  it("treats an unknown email as invalid without leaking that fact", async () => {
    const result = await consumeVerificationCode("nobody@test.dev", "123456");
    expect(result.valid).toBe(false);
  });

  it("keeps one live code per address", async () => {
    await storeVerificationCode("alice@test.dev", "111111");
    await storeVerificationCode("alice@test.dev", "222222");

    expect(await collections.verificationCodes().countDocuments({})).toBe(1);
    expect((await consumeVerificationCode("alice@test.dev", "111111")).valid).toBe(
      false,
    );
  });
});

describe("user upsert", () => {
  it("creates on first sign-in and reuses afterwards", async () => {
    const first = await getOrCreateUserByEmail("alice@test.dev");
    const second = await getOrCreateUserByEmail("alice@test.dev");

    expect(first._id.toString()).toBe(second._id.toString());
    expect(await collections.users().countDocuments({})).toBe(1);
  });

  it("defaults role to user", async () => {
    const user = await getOrCreateUserByEmail("alice@test.dev");
    expect(user.role).toBe("user");
  });

  it("does not race into duplicates under concurrency", async () => {
    await syncIndexes();

    await Promise.all(
      Array.from({ length: 8 }, () => getOrCreateUserByEmail("race@test.dev")),
    );

    expect(await collections.users().countDocuments({})).toBe(1);
  });
});
