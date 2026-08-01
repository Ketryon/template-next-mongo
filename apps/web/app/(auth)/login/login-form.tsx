"use client";

import { signIn } from "@ketryon/auth/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * provsvaret's two-step client flow:
 *
 *   POST /api/auth/email/send    → code goes to the inbox
 *   POST /api/auth/email/verify  → returns a completionToken (+ sets the nonce cookie)
 *   signIn("email", { completionToken })
 *
 * The raw code never reaches Auth.js; only the server-minted token does.
 */
export function LoginForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  function requestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("email") ?? "");

    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/auth/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });

      if (!response.ok) {
        setError(
          response.status === 429
            ? "Too many requests. Try again shortly."
            : "Could not send the code.",
        );
        return;
      }

      setEmail(value);
      setStep("code");
    });
  }

  function submitCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "");

    startTransition(async () => {
      setError(null);

      const response = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const body = (await response.json().catch(() => null)) as
        | { completionToken?: string; error?: string }
        | null;

      if (!response.ok || !body?.completionToken) {
        setError(body?.error ?? "Invalid code");
        return;
      }

      const result = await signIn("email", {
        completionToken: body.completionToken,
        redirect: false,
      });

      if (result?.error) {
        setError("Could not sign in");
        return;
      }

      router.push("/orders");
      router.refresh();
    });
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      {step === "email" ? (
        <form onSubmit={requestCode} className="flex flex-col gap-2">
          <input
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
            className="rounded border border-neutral-300 px-3 py-2 text-base"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {pending ? "Sending…" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={submitCode} className="flex flex-col gap-2">
          <p className="text-sm text-neutral-600">
            Code sent to <strong>{email}</strong>
          </p>
          <input
            name="code"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="000000"
            required
            autoComplete="one-time-code"
            className="rounded border border-neutral-300 px-3 py-2 text-base tracking-[0.5em]"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {pending ? "Verifying…" : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setError(null);
            }}
            className="text-left text-sm underline"
          >
            Use a different email
          </button>
        </form>
      )}

      {/* Rendered unconditionally; 404s until AUTH_GITHUB_ID/SECRET are set. */}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await signIn("github", { callbackUrl: "/orders" });
          })
        }
        className="rounded border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50"
      >
        Continue with GitHub
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
