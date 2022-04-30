import pg from 'pg';

import { EnvPostgresConfig } from "../config";

const pgCfg = new EnvPostgresConfig();

export const pool = new pg.Pool({
  connectionString: pgCfg.pgURI(),
});
pool.on('error', (err) => {
  console.error(`Postgres pool error: ${err}`);
});
