const { version } = require("../package");
const fs = require("fs");
const execa = require("execa");

async function updateExample() {
  process.chdir("./example");

  // example/ uses eslintrc, which ESLint 9 only loads when asked to.
  process.env.ESLINT_USE_FLAT_CONFIG = "false";

  // Update .esplint.rec.json
  const { run } = require("../lib/engine");
  await run(
    {
      overwrite: true,
    },
    []
  );

  // Update package.json
  const examplePackageFile = fs.readFileSync("./package.json", "utf8");
  fs.writeFileSync(
    "./package.json",
    examplePackageFile.replace(
      /"esplint": "\^[0-9.]+"/,
      `"esplint": "^${version}"`
    ),
    "utf8"
  );

  // Stage on git
  execa.sync("git", ["add", "."]);
}

(function postversion() {
  updateExample();
})();
