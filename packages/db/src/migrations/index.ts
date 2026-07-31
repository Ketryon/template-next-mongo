import type { Db } from "mongodb";
import { m0001CollectionValidators } from "./0001-collection-validators";

export interface Migration {
  /** Sortable, immutable once merged. */
  id: string;
  up: (db: Db) => Promise<void>;
}

/** Applied in array order; each id is recorded in `_migrations`. */
export const migrations: Migration[] = [m0001CollectionValidators];
