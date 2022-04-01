import { Config } from "./config";
import { DiscordAdapter } from "./adapters/discord";
import {
  Role,
  RoleManager,
  RoleManagerImpl,
  PGRoleRepository,
} from "./roles";
import { wait } from "./utils/wait";

/**
 * Primary entrypoint for the program.
 */
async function main() {
  // Load configuration
  const cfg = new Config();

  // Setup Discord
  const discordAdapter = new DiscordAdapter({
    config: cfg.discord,
    roleManager: new RoleManagerImpl({
      roleRepo: new PGRoleRepository(),
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
