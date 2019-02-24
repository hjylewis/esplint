const os = require("os");
const path = require("path");
const execa = require("execa");
const log = require("../../lib/log");
const fs = require("fs");
const stripJsonComments = require("strip-json-comments");

log.log = jest.fn();
log.error = jest.fn();
log.warn = jest.fn();

const fixtureDir = `${os.tmpdir()}/esplint/fixtures`;
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
  const recordPath = path.join(fixturePath, ".esplint.rec.json");
  return JSON.parse(stripJsonComments(fs.readFileSync(recordPath, "utf8")));
}

function setup(fixtureName, test) {
  const fixturePath = getFixturePath(fixtureName);
  return (...args) => {
    process.chdir(fixturePath);
    test({ fixturePath }, ...args);
    resetFixturePath(fixtureName);
  };
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

  it(
    "throws error if no esplint config",
    setup("no-config", () => {
      const { run } = require("../../lib/engine");
      expect(() => {
        run({}, ["index.js"]);
      }).toThrowErrorMatchingSnapshot();
    })
  );

  it(
    "throws error if eslint error",
    setup("eslint-error", () => {
      const { run } = require("../../lib/engine");
      try {
        run({}, ["index.js"]);
        expect("This should never be reached").toEqual(false);
      } catch (e) {
        const error = e.toString();
        expect(error).toEqual(
          expect.stringContaining(
            "There were some ESLint errors. Fix them and try again."
          )
        );
        expect(error).toEqual(
          expect.stringContaining("Unexpected console statement")
        );
      }
    })
  );

  it(
    "prints error if increase in eslint warnings",
    setup("increase-warning", () => {
      const { run } = require("../../lib/engine");
      const { results, hasError } = run({}, ["index.js"]);
      expect(hasError).toEqual(true);
      expect(results).toHaveLength(1);
      expect(results[0].type).toEqual("error");
      expect(results[0]).toMatchSnapshot();
    })
  );

  it(
    "no errors and changes record count when warnings decrease",
    setup("decrease-warning", ({ fixturePath }) => {
      const { run } = require("../../lib/engine");
      const { results, hasError } = run({}, ["index.js"]);
      expect(hasError).toEqual(false);
      expect(results).toHaveLength(0);

      const record = readRecord(fixturePath);
      expect(record.files["index.js"]["no-console"]).toEqual(1);
    })
  );

  it(
    "returns message about turning off warning when count is zero",
    setup("decrease-warning-zero", ({ fixturePath }) => {
      const { run } = require("../../lib/engine");

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
    })
  );

  it(
    "should message about turning off warning when count is zero because a file was deleted",
    setup("decrease-warning-zero-delete-file", () => {
      const { run } = require("../../lib/engine");

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
    })
  );

  it(
    "cleans up record by deleting removed files",
    setup("delete-file", ({ fixturePath }) => {
      const { run } = require("../../lib/engine");

      const { results, hasError } = run({}, ["."]);
      expect(hasError).toEqual(false);
      expect(results).toHaveLength(0);

      const record = readRecord(fixturePath);
      expect(record.files["not-index.js"]).toEqual(undefined);
    })
  );

  it(
    "ignores eslint rules not listed in config",
    setup("no-rules", () => {
      const { run } = require("../../lib/engine");

      const { results, hasError } = run({}, ["."]);
      expect(hasError).toEqual(false);
      expect(results).toHaveLength(0);
    })
  );

  it(
    "alerts user when no rules are being tracked",
    setup("no-rules", () => {
      const { run } = require("../../lib/engine");

      run({}, ["."]);
      expect(log.warn).toHaveBeenCalledWith(
        log.createWarning(
          "No rules are being tracked. Add some rules to your esplint config."
        )
      );
    })
  );

  it(
    "lints full surface area when no files are provided",
    setup("decrease-warning", ({ fixturePath }) => {
      const { run } = require("../../lib/engine");

      run({}, []);
      expect(log.log).toHaveBeenCalledWith(
        `No files provided, linting full surface area...`
      );
      const record = readRecord(fixturePath);
      expect(record.files["index.js"]["no-console"]).toEqual(1);
    })
  );

  it(
    "warns when rule is specified in esplint config but is not a warning in your eslint config",
    setup("not-a-warning", () => {
      const { run } = require("../../lib/engine");

      const { results } = run({}, ["."]);
      expect(results).toHaveLength(1);
      expect(results[0].type).toEqual("warning");
      expect(results[0]).toMatchSnapshot();
    })
  );

  it(
    "creates new record when there wasn't one",
    setup("no-record", ({ fixturePath }) => {
      const { run } = require("../../lib/engine");

      run({}, ["."]);
      const record = readRecord(fixturePath);
      expect(record.files["index.js"]["no-console"]).toEqual(1);
    })
  );

  it(
    "throws error if record is not valid json",
    setup("invalid-record", () => {
      const { run } = require("../../lib/engine");

      expect(() => {
        run({}, ["."]);
      }).toThrowErrorMatchingSnapshot();
    })
  );

  it(
    "overwrites existing file is 'overwrite' is passed",
    setup("increase-warning", () => {
      const { run } = require("../../lib/engine");
      const { results, hasError } = run({ overwrite: true }, ["index.js"]);
      expect(hasError).toEqual(false);
      expect(results).toHaveLength(0);
      expect(log.log).toHaveBeenCalledWith(
        "Overwriting existing the record file..."
      );
    })
  );

  it(
    "overwrites exisiting record if config hashes don't match",
    setup("no-hash-match", () => {
      const { run } = require("../../lib/engine");
      const { results, hasError } = run({}, ["index.js"]);
      expect(hasError).toEqual(false);
      expect(results).toHaveLength(0);
      expect(log.warn).toHaveBeenCalledWith(
        log.createWarning(
          "Hashes don't match. Overwriting existing record file..."
        )
      );
    })
  );

  it(
    "adds a new file with no error",
    setup("new-file", ({ fixturePath }) => {
      const { run } = require("../../lib/engine");
      const { results, hasError } = run({}, ["."]);
      expect(hasError).toEqual(false);
      expect(results).toHaveLength(0);

      const record = readRecord(fixturePath);
      expect(record.files["newFile.js"]["no-console"]).toEqual(0);
    })
  );

  it(
    "errors if new file has error",
    setup("new-file-with-error", () => {
      const { run } = require("../../lib/engine");
      const { results, hasError } = run({}, ["."]);
      expect(hasError).toEqual(true);
      expect(results).toHaveLength(1);
    })
  );

  it(
    "sorts files",
    setup("sorts-files", ({ fixturePath }) => {
      const { run } = require("../../lib/engine");
      const { results, hasError } = run({}, ["."]);
      expect(hasError).toEqual(false);
      expect(results).toHaveLength(0);

      const record = readRecord(fixturePath);
      expect(Object.keys(record.files)).toEqual(["a.js", "b.js", "z.js"]);
    })
  );

  it(
    'does not update record if "write" option is false',
    setup("decrease-warning", ({ fixturePath }) => {
      const { run } = require("../../lib/engine");

      run({ write: false }, []);
      expect(log.log).toHaveBeenCalledWith(
        `No files provided, linting full surface area...`
      );
      const record = readRecord(fixturePath);
      expect(record.files["index.js"]["no-console"]).toEqual(2);
    })
  );

  it(
    'still makes checks if "write" option is false',
    setup("increase-warning", () => {
      const { run } = require("../../lib/engine");
      const { results, hasError } = run({ write: false }, ["index.js"]);
      expect(hasError).toEqual(true);
      expect(results).toHaveLength(1);
      expect(results[0].type).toEqual("error");
      expect(results[0]).toMatchSnapshot();
    })
  );
});
