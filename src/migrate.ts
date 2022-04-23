import { MigrationManager } from "east";

import { EnvPostgresConfig } from "./config";

type MigrationMode = "up" | "down";

async function main() {
  // Get arguments
  const args = [ ...process.argv ];
  args.shift();
  args.shift();

  let mode: MigrationMode = "up";

  if (args.length === 1) {
    const modeArg = args[0];
    if (modeArg === "up") {
      mode = "up";
    } else if (modeArg === "down") {
      mode = "down";
    } else {
      throw new Error(`Unrecognized mode argument value '${modeArg}', can only be 'up' or 'down'`);
    }
  } else if (args.length > 1) {
    throw new Error(`Invalid usage
Usage:

migrate.js [up|down]`);
  }

  // Print intent
  if (mode === "up") {
    console.log("Will setup database");
  } else {
    console.log("Will destroy database");
  }

  // Setup migration manager
  const migrationManager = new MigrationManager();

  // Log target migrations before execution
  migrationManager.once("beforeMigrateMany", (migrationNames) => {
    console.log("Target migrations: ", migrationNames);
  });

  // Get database configuration
  const pgCfg = new EnvPostgresConfig();

  await migrationManager.configure({
    adapter: "east-postgres",
    url: pgCfg.pgURI(),
  });

  // Migrate
  try {
    await migrationManager.connect();
    
    // Run new migrations
    if (mode === "up") {
      // Create database
      await migrationManager.migrate({ status: "new" });
    } else {
      // Destroy database
      const migrations = await migrationManager.getMigrationNames({
        status: "executed",
        reverseOrderResult: true,
      });

      await migrationManager.rollback({
        migrations,
      });
    }
  } finally {
    await migrationManager.disconnect();
  }
}

main().catch((err) => {
  console.error("Error occurred while migrating database: ", err.stack || err);
  process.exit(1);
}).then(() => {
  console.log("Done migrating");
});
