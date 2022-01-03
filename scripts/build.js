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

const ENTRYPOINTS = [ path.join(__dirname, "../src/index.ts") ];
const OUTFILE = path.join(BUILD_OUT_DIR, "index.js");

/**
 * ESBuild plugin which redirectd "~/" -> "./src/".
 * Arguments:
 * - srcDir (String) - The directory to which "~/" will point.
 */
const TILDE_IMPORT_PLUGIN = {
  name: "tilde-import",
  setup(build) {
    // Redirect all paths starting with "~/" to "./src/"
    build.onResolve({ filter: /^~\// }, (args) => {
      return {
        path: path.join(SRC_DIR, args.path.replace(/(~\/)(.*)/, "$2")) + path.extname(args.importer),
      };
    });
  },
}

/**
 * Build the project.
 * @returns Promise which resolves when the build is complete, or rejects if there is an error.
 */
async function build(watch) {
  await esbuild.build({
    entryPoints: ENTRYPOINTS,
    bundle: true,
    platform: "node",
    target: "node16",
    outfile: OUTFILE,
    plugins: [
      TILDE_IMPORT_PLUGIN,
    ],
  });
}

// Parse command line options
let argv = process.argv.slice(2);

let watch = false;

for (let arg of argv) {
  switch (arg) {
  default:
    console.error(`${EXIT_MSG_UNKNOWN_OPT}: ${arg}`);
    process.exit(EXIT_CODE_UNKNOWN_OPT);
    break;
  }
}


// Execute build function
build(watch).then(() => {
  console.log(`Build success: ${OUTFILE}`);
}).catch((e) => {
  console.error(`${EXIT_MSG_BUILD_FAIL}: ${e}`);
  process.exit(EXIT_CODE_BUILD_FAIL);
});
