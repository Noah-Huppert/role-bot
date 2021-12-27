import { Config } from "./config";
import { DiscordAdapter } from "./adapters/discord";
import { Role, RoleManager } from "./ports/roles";
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
    roleManager: {
      listRoles: async (): Promise<Role[]> => {
        return [
          {
            name: "role",
            description: "role role",
          }
        ];
      },
    },
  });

  await discordAdapter.setup();

  console.log("Setup Discord");

  // Wait for control sign to exit
  let shouldExit = false;
  
  process.on("SIGINT", () => {
    shouldExit = true;
  });

  while (!shouldExit) {
    await wait(1000);
  }
}

// Run entrypoint
main();
