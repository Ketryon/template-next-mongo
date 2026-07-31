import type { Session } from "./session";

/**
 * Typed failures so callers can map to HTTP without string-matching messages,
 * and so a thrown error can never leak a driver stack trace to a response body.
 */
export class DbError extends Error {
  readonly status: number = 500;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DbError {
  override readonly status = 404;

  constructor(what = "Resource") {
    super(`${what} not found`);
  }
}

export class UnauthorizedError extends DbError {
  override readonly status = 401;

  constructor(message = "Not authenticated") {
    super(message);
  }
}

export class ForbiddenError extends DbError {
  override readonly status = 403;

  constructor(message = "Not allowed") {
    super(message);
  }
}

export class ValidationError extends DbError {
  override readonly status = 400;

  constructor(
    message = "Invalid input",
    readonly issues?: unknown,
  ) {
    super(message);
  }
}

/** Narrow a session to an admin, or throw. Used by every `dal/admin/*` fn. */
export function requireAdmin(session: Session): Session {
  if (session.role !== "admin") throw new ForbiddenError("Admin role required");
  return session;
}
