import pg from "pg";

/** The only database surface the app needs; tests substitute a fake. */
export interface Db {
  query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<pg.QueryResult<T>>;
  end(): Promise<void>;
}

export function createPool(connectionString: string): Db {
  return new pg.Pool({ connectionString, max: 10, connectionTimeoutMillis: 3000 });
}
