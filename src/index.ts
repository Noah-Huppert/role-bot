import { EnvConfig } from "./config";
import { DiscordAdapter } from "./adapters/discord";
import {
  Role,
  RoleListManager,
  RoleListManagerImpl,
  PGRoleListRepository,
} from "./roles";
import { wait } from "./utils/wait";


/**
 * Primary entrypoint for the program.
 */
async function main() {
  // Load configuration
  const cfg = new EnvConfig();

  // Setup Discord
  const discordAdapter = new DiscordAdapter({
    config: cfg.discord,
    roleListManager: new RoleListManagerImpl({
      roleListRepo: new PGRoleListRepository(cfg.postgres),
    }),
  });
  

  await discordAdapter.setup();

  console.log("Discord adapter ready");

  // Wait for control sign to exit
  let shouldExit = false;
  
  process.on("SIGINT", () => {
    shouldExit = true;
  });

  while (!shouldExit) {
    await wait(100);
  }
}

// Run entrypoint
main();
