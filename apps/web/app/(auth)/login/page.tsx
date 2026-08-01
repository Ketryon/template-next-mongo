import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getSession()) redirect("/orders");

  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm text-neutral-600">
        We&apos;ll email you a six-digit code.
      </p>
      <LoginForm />
      <Link href="/" className="mt-6 inline-block text-sm underline">
        ← Home
      </Link>
    </main>
  );
}
