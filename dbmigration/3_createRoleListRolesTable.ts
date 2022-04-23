import { EastPGClient } from "east-postgres";

export const tags = [];

export async function migrate(client: EastPGClient) {
  await client.db.query(`CREATE TABLE role_list_roles (
id           SERIAL PRIMARY KEY,
role_id      INTEGER REFERENCES role(id),
role_list_id INTEGER REFERENCES role_list(id),
emoji        TEXT NOT NULL,
UNIQUE(role_list_id, emoji)
)`);
}

export async function rollback(client: EastPGClient) {
  await client.db.query(`DROP TABLE role_list_roles`);
}
