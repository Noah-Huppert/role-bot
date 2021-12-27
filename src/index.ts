import { Config } from "./config";
import { DiscordAdapter } from "./roles/adapters/discord";
import { Role, RoleManager } from "./roles/ports";

/**
 * Primary entrypoint for the program.
 */
async function main() {
  const cfg = new Config();
  const discordAdapter = new DiscordAdapter({
    config: cfg.discord,
    roleManager: {
      listRoles: async (): Promise<Role[]> => {
        return [];
      },
    },
  });

  await discordAdapter.main();
}

// Run entrypoint
main()
  .then(() => {
    console.log("Done");
  })
  .catch((e) => {
    console.error("Error", e);
  });
