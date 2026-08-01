import "server-only";

/**
 * Session resolution, re-exported from the auth package.
 *
 * This file used to be a stub, and the fact that replacing it was a one-line
 * change is the point of the design: `packages/db` defines the `Session`
 * contract, every DAL function takes one, and nothing in the DAL knows which
 * library produced it.
 */
export { getSession, requireSession } from "@ketryon/auth";
