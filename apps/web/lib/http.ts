import { DbError } from "@ketryon/db";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * One error mapper for every route handler, so handlers contain no try/catch
 * boilerplate and no route can accidentally return a driver stack trace.
 */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid input", issues: error.issues },
      { status: 400 },
    );
  }

  if (error instanceof DbError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

/** Wrap a handler so thrown DAL errors become the right status automatically. */
export function handler<T extends unknown[]>(
  fn: (...args: T) => Promise<NextResponse>,
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await fn(...args);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
