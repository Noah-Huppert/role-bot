import * as zg from "zapatos/generate";

import { EnvPostgresConfig } from "./config";

async function main() {
  // Get database configuration
  const pgCfg = new EnvPostgresConfig();

  // Generate types
  const zapCfg: zg.Config = {
    db: {
      connectionString: pgCfg.pgURI(),
    },
    outDir: "./src/pg/",
  };
  
  await zg.generate(zapCfg);
}

main().then(() => {
  console.log("Successfully generated types from Postgres schema");
}).catch((e) => {
  console.error(`Error generating types from Postgres schema: ${e}`);
  process.exit(1);
});
