import { describe, expect, it } from "vitest";

import {
  generateCompletionToken,
  generateNonce,
  verifyCompletionToken,
} from "../completion-token";

describe("completion token", () => {
  it("round-trips a valid token", () => {
    const nonce = generateNonce();
    const token = generateCompletionToken("alice@test.dev", "email", nonce);

    expect(verifyCompletionToken(token, "email", nonce)).toEqual({
      subject: "alice@test.dev",
    });
  });

  it("rejects a tampered payload", () => {
    const nonce = generateNonce();
    const token = generateCompletionToken("alice@test.dev", "email", nonce);

    // Swap the asserted identity, keep the signature.
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const forged = Buffer.from(
      decoded.replace("alice@test.dev", "admin@test.dev"),
      "utf8",
    ).toString("base64url");

    expect(verifyCompletionToken(forged, "email", nonce)).toBeNull();
  });

  /**
   * The refinement over provsvaret: their email token carried no browser
   * binding, so within its 60s window it was usable from anywhere.
   */
  it("rejects a token presented with a different nonce", () => {
    const token = generateCompletionToken("alice@test.dev", "email", generateNonce());
    expect(verifyCompletionToken(token, "email", generateNonce())).toBeNull();
  });

  it("rejects a token presented with no nonce at all", () => {
    const nonce = generateNonce();
    const token = generateCompletionToken("alice@test.dev", "email", nonce);
    expect(verifyCompletionToken(token, "email", undefined)).toBeNull();
  });

  /** One method's token must not be redeemable at another (e.g. BankID later). */
  it("rejects a token minted for a different method", () => {
    const nonce = generateNonce();
    const token = generateCompletionToken("alice@test.dev", "email", nonce);
    expect(verifyCompletionToken(token, "bankid", nonce)).toBeNull();
  });

  it("rejects an expired token", () => {
    const nonce = generateNonce();
    const token = generateCompletionToken("alice@test.dev", "email", nonce);

    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const expired = Buffer.from(
      decoded.replace(/"exp":\d+/, `"exp":${Date.now() - 1}`),
      "utf8",
    ).toString("base64url");

    expect(verifyCompletionToken(expired, "email", nonce)).toBeNull();
  });

  /**
   * A wrong-length signature must return null, not throw. timingSafeEqual
   * raises a RangeError on mismatched lengths; provsvaret let the surrounding
   * try/catch absorb it, which worked but conflated two failure modes.
   */
  it("returns null rather than throwing on a malformed signature", () => {
    const nonce = generateNonce();
    const token = generateCompletionToken("alice@test.dev", "email", nonce);

    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const truncated = Buffer.from(
      `${decoded.slice(0, decoded.lastIndexOf(":"))}:abc`,
      "utf8",
    ).toString("base64url");

    expect(() => verifyCompletionToken(truncated, "email", nonce)).not.toThrow();
    expect(verifyCompletionToken(truncated, "email", nonce)).toBeNull();
  });

  it("rejects garbage", () => {
    const nonce = generateNonce();
    for (const bad of ["", "not-base64", "Zm9v", "a:b:c"]) {
      expect(verifyCompletionToken(bad, "email", nonce)).toBeNull();
    }
  });
});
