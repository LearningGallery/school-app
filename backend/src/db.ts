import pg from "pg";

/** The only database surface the app needs; tests substitute a fake. */
export interface Db {
  query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<pg.QueryResult<T>>;
  end(): Promise<void>;
}

export function createPool(connectionString: string, onError: (err: Error) => void = () => {}): Db {
  const pool = new pg.Pool({ connectionString, max: 10, connectionTimeoutMillis: 3000 });
  // An idle connection that the server drops (restart, RDS failover) emits "error" on the pool.
  // Unhandled, that crashes the process; handled, the pool discards the client and reconnects on demand.
  pool.on("error", onError);
  return pool;
}
