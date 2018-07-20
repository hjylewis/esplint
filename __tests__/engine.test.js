const os = require("os");
const path = require("path");
const execa = require("execa");
const log = require("../lib/log");

log.log = jest.fn();
log.error = jest.fn();
log.warn = jest.fn();

const fixtureDir = `${os.tmpdir()}/esplint/fixtures`;
const cwd = process.cwd();

function getFixturePath(...args) {
  return path.join(fixtureDir, ...args);
}

describe("engine", () => {
  beforeAll(() => {
    execa.sync("mkdir", ["-p", fixtureDir]);
    execa.sync("cp", ["-r", "./__tests__/fixtures/.", fixtureDir]);
  });

  afterEach(() => {
    process.chdir(cwd);
  });

  afterAll(() => {
    execa.sync("rm", ["-r", fixtureDir]);
  });

  it("throws error if no esplint config", () => {
    const path = getFixturePath("no-config");
    process.chdir(path);

    const { run } = require("../lib/engine");
    expect(() => {
      run({}, ["index.js"]);
    }).toThrowErrorMatchingSnapshot();
  });

  it("throws error if eslint error", () => {
    const path = getFixturePath("eslint-error");
    process.chdir(path);

    const { run } = require("../lib/engine");
    expect(() => {
      run({}, ["index.js"]);
    }).toThrowErrorMatchingSnapshot();
  });
});
