import "reflect-metadata"; // Required for typeorm
import { Bot } from "./bot";

async function main(): Promise<void> {
  const bot = new Bot();
  await bot.init();

  await new Promise<void>((resolve, reject) => {
    process.on("SIGINT", () => {
      resolve();
    });
  });
}

main().then(() => {
  console.log("Done");
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
