const { version } = require("../package");
const fs = require("fs");
const execa = require("execa");

function updateExample() {
  process.chdir("./example");

  // Update .esplint.rec.json
  const { run } = require("../lib/engine");
  run({}, []);

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
