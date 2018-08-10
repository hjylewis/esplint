const os = require("os");
const path = require("path");
const execa = require("execa");
const log = require("../lib/log");
const fs = require("fs");
const stripJsonComments = require("strip-json-comments");

log.log = jest.fn();
log.error = jest.fn();
log.warn = jest.fn();

const fixtureDir = `${os.tmpdir()}/esplint/fixtures`;
const fixtureSrc = path.resolve("./__tests__/fixtures");
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
  const recordPath = path.join(fixturePath, ".esplint.rec.json");
  return JSON.parse(stripJsonComments(fs.readFileSync(recordPath, "utf8")));
}

describe("engine", () => {
  beforeAll(() => {
    execa.sync("mkdir", ["-p", fixtureDir]);
    execa.sync("cp", ["-r", `${fixtureSrc}/.`, fixtureDir]);
  });

  afterEach(() => {
    process.chdir(cwd);
  });

  afterAll(() => {
    execa.sync("rm", ["-r", fixtureDir]);
  });

  it("throws error if no esplint config", () => {
    const fixturePath = getFixturePath("no-config");
    process.chdir(fixturePath);

    const { run } = require("../lib/engine");
    expect(() => {
      run({}, ["index.js"]);
    }).toThrowErrorMatchingSnapshot();
  });

  it("throws error if eslint error", () => {
    const fixturePath = getFixturePath("eslint-error");
    process.chdir(fixturePath);

    const { run } = require("../lib/engine");
    expect(() => {
      run({}, ["index.js"]);
    }).toThrowErrorMatchingSnapshot();
  });

  it("prints error if increase in eslint warnings", () => {
    const fixturePath = getFixturePath("increase-warning");
    process.chdir(fixturePath);

    const { run } = require("../lib/engine");
    const { results, hasError } = run({}, ["index.js"]);
    expect(hasError).toEqual(true);
    expect(results).toHaveLength(1);
    expect(results[0].type).toEqual("error");
    expect(results[0]).toMatchSnapshot();
  });

  it("no errors and changes record count when warnings decrease", () => {
    const fixturePath = getFixturePath("decrease-warning");
    process.chdir(fixturePath);

    const { run } = require("../lib/engine");
    const { results, hasError } = run({}, ["index.js"]);
    expect(hasError).toEqual(false);
    expect(results).toHaveLength(0);

    const record = readRecord(fixturePath);
    expect(record.files["index.js"]["no-console"]).toEqual(1);

    resetFixturePath("decrease-warning");
  });

  it("returns message about turning off warning when count is zero", () => {
    const fixturePath = getFixturePath("decrease-warning-zero");
    process.chdir(fixturePath);
    const { run } = require("../lib/engine");

    // Run twice
    const [result1, result2] = [{}, {}].map(() => {
      const { results, hasError } = run({}, ["index.js"]);
      expect(hasError).toEqual(false);
      expect(results).toHaveLength(1);
      const result = results[0];
      expect(result.type).toEqual("info");
      return result;
    });

    // Get same result
    expect(result1).toMatchObject(result2);
    expect(result1).toMatchSnapshot();

    // Count set to 0
    const record = readRecord(fixturePath);
    expect(record.files["index.js"]["no-console"]).toEqual(0);

    resetFixturePath("decrease-warning-zero");
  });

  it("cleans up record by deleting removed files", () => {
    const fixturePath = getFixturePath("delete-file");
    process.chdir(fixturePath);
    const { run } = require("../lib/engine");

    const { results, hasError } = run({}, ["."]);
    expect(hasError).toEqual(false);
    expect(results).toHaveLength(0);

    const record = readRecord(fixturePath);
    expect(record.files["not-index.js"]).toEqual(undefined);

    resetFixturePath("delete-file");
  });

  it("ignores eslint rules not listed in config", () => {});

  it("No rules are being tracked. Add some rules to your esplint config.", () => {});

  it(`No files provided, linting full surface area...`, () => {});

  it("is specified in your esplint config but is not a warning in your eslint config.", () => {});

  it("creates new record", () => {});

  it("Overwriting existing the record file...", () => {});

  it("Hashes don't match. Overwriting existing record file...", () => {});
});
