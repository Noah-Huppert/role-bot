#!/usr/bin/env node
import { build } from "esbuild";

export const BUILD_CONFIG = {
  entryPoints: [
	  "./src/index.ts",
  ],
  outdir: "./dist",
  bundle: false,
  sourcemap: "inline",
  platform: "node",
  tsconfig: "tsconfig.json",
  // external: ["./node_modules/*"],
  // format: "esm",
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
