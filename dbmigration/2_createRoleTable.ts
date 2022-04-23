import { EastPGClient } from "east-postgres";

export const tags = [];

export async function migrate(client: EastPGClient) {
  await client.db.query(`CREATE TABLE role (
id   SERIAL PRIMARY KEY,
name TEXT NOT NULL
)`);
}

export async function rollback(client: EastPGClient) {
  await client.db.query(`DROP TABLE role`);
}
