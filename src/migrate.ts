import { MigrationManager } from "east";

import { EnvPostgresConfig } from "./config";

async function main() {
  const migrationManager = new MigrationManager();

  // log target migrations before execution
  migrationManager.once("beforeMigrateMany", (migrationNames) => {
    console.log("Target migrations: ", migrationNames);
  });

  // Configure
  const pgCfg = new EnvPostgresConfig();
  console.log("pgURI: ", pgCfg.pgURI());

  await migrationManager.configure({
    adapter: "east-postgres",
    url: pgCfg.pgURI(),
  });

  // Migrate
  try {
    await migrationManager.connect();
    // select for migration all not executed migrations
    await migrationManager.migrate({ status: "new" });
  } finally {
    await migrationManager.disconnect();
  }
}

main().catch((err) => {
  console.error("Error occurred while migrating database: ", err.stack || err);
});
