import { DiscordAdapter } from "./roles/adapters/discord";

/**
 * Primary entrypoint for the program.
 */
async function main() {
  const discordAdapater = new DiscordAdapter();

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
