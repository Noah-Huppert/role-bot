const path = require("path");

const esbuild = require("esbuild");
const alias = require("esbuild-plugin-alias");

// Script exit codes
const EXIT_CODE_UNKNOWN_OPT = 10;
const EXIT_MSG_UNKNOWN_OPT = "Unknown command line option";

const EXIT_CODE_BUILD_FAIL = 20;
const EXIT_MSG_BUILD_FAIL = "ESBuild failed to build the source code";

// Constants
const SRC_DIR = path.join(__dirname, "../src");
const BUILD_OUT_DIR = path.join(__dirname, "../build");

const ENTRYPOINTS = [ path.join(SRC_DIR, "index.ts") ];
const OUTFILE = path.join(BUILD_OUT_DIR, "index.js");

/**
 * Build the project.
 * @param watch - If true then watch for source code changes and rebuild.
 * @returns Promise which resolves when the build is complete, or rejects if there is an error.
 */
async function build(watch) {
  
  await esbuild.build({
    entryPoints: ENTRYPOINTS,
    watch: watch,
    bundle: true,
    platform: "node",
    outfile: OUTFILE,
    plugins: [
      alias({
        "~": SRC_DIR,
      }),
    ],
  });
}

// Parse command line options
let argv = process.argv.slice(2);

let watch = false;

for (let arg in argv) {
  switch (arg) {
  case "--watch":
    watch = true;
    break;
  default:
    console.error(`${EXIT_MSG_UNKNOWN_OPT}: ${opt}`);
    process.exit(EXIT_CODE_UNKNOWN_OPT);
    break;
  }
}


// Execute build function
build(watch).then(() => {
  console.log("Build success");
}).catch(() => {
  // Error already printed to console by ESBuild
  console.error(EXIT_MSG_BUILD_FAIL);
  process.exit(EXIT_CODE_BUILD_FAIL);
});
