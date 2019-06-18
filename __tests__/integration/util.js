const os = require("os");
const path = require("path");
const fs = require("fs");
const stripJsonComments = require("strip-json-comments");
const execa = require("execa");

function fixtureInit(id) {
  const fixtureDir = `${os.tmpdir()}/esplint/${id}/fixtures`;
  const fixtureSrc = path.resolve("./__tests__/integration/fixtures");
  const cwd = process.cwd();

  function getFixturePath(...args) {
    return path.join(fixtureDir, ...args);
  }

  function resetFixturePath(...args) {
    const dest = path.join(fixtureDir, ...args);
    const src = path.join(fixtureSrc, ...args);

    execa.sync("cp", ["-fr", `${src}/.`, dest]);
  }

  function readRecord(fixturePath) {
    return JSON.parse(
      stripJsonComments(readFile(fixturePath, ".esplint.rec.json"))
    );
  }

  function readFile(fixturePath, filename) {
    const recordPath = path.join(fixturePath, filename);
    return fs.readFileSync(recordPath, "utf8");
  }

  function setup(fixtureName, test) {
    const fixturePath = getFixturePath(fixtureName);
    return (...args) => {
      process.chdir(fixturePath);
      test({ fixturePath }, ...args);
      resetFixturePath(fixtureName);
    };
  }

  function onBeforeAll() {
    execa.sync("mkdir", ["-p", fixtureDir]);
    execa.sync("cp", ["-r", `${fixtureSrc}/.`, fixtureDir]);
  }

  function onAfterEach() {
    process.chdir(cwd);
  }

  function onAfterAll() {
    execa.sync("rm", ["-r", fixtureDir]);
  }
  return {
    setup,
    readRecord,
    readFile,
    onBeforeAll,
    onAfterEach,
    onAfterAll
  };
}

module.exports = {
  fixtureInit
};
