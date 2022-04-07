#!/usr/bin/env node
import { build } from "esbuild";

export const BUILD_CONFIG = {
  entryPoints: [
	  "./src/index.ts",
  ],
  outdir: "./dist",
  platform: "node",
  bundle: true,
  target: "es2020",
  platform: "node",
};

if (import.meta.url === `file://${process.argv[1]}`) {
  // module was not imported but called directly
  build(BUILD_CONFIG)
    .then(() => {
      console.log("Built");
    }).catch((e) => {
      console.trace(e);
      process.exit(1);
    });
}
