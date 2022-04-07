#!/usr/bin/env node
import { build } from "esbuild";

import { spawn } from "child_process";

import { BUILD_CONFIG } from "./build.mjs";

/**
 * Run the nodemon process.
 */
async function nodemon() {
  const proc = spawn("nodemon");

  proc.stdout.on("data", (data) => process.stdout.write(data.toString()));
  proc.stderr.on("data", (data) => process.stderr.write(data.toString()));
  proc.on("close", (code) => console.error(`Nodemon exit: ${code}`));
}

build({
  ...BUILD_CONFIG,
  watch: {
    onRebuild(error, result) {
      if (error !== undefined) {
        console.error(error);
      } else {
        console.log("Built");
      }
    },
  },
}).then(() => {
  console.log("Built, running in watch mode");
  nodemon();
}).catch((e) => {
  console.trace(e);
  process.exit(1);
});
