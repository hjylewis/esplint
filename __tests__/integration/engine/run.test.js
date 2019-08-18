const log = require("../../../lib/log");
const stripAnsi = require("strip-ansi");
const { fixtureInit } = require("../util");
jest.mock("../../../package.json", () => ({ version: "1.0.0" }));

const { setup, readRecord, onBeforeAll, onAfterEach, onAfterAll } = fixtureInit(
  "engine.run"
);

log.log = jest.fn();
log.error = jest.fn();
log.warn = jest.fn();

describe("engine.run", () => {
  beforeAll(onBeforeAll);

  afterEach(onAfterEach);

  afterAll(onAfterAll);

  it(
    "throws error if no esplint config",
    setup("no-config", () => {
      const { run } = require("../../../lib/engine");
      expect(() => {
        run({}, ["index.js"]);
      }).toThrowErrorMatchingSnapshot();
    })
  );

  it(
    "throws error if eslint error",
    setup("eslint-error", () => {
      const { run } = require("../../../lib/engine");
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
      const { run } = require("../../../lib/engine");
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
      const { run } = require("../../../lib/engine");
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
      const { run } = require("../../../lib/engine");

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

      // Hide file
      const record = readRecord(fixturePath);
      expect(record.files["index.js"]).toEqual(undefined);
    })
  );

  it(
    "should message about turning off warning when count is zero because a file was deleted",
    setup("decrease-warning-zero-delete-file", () => {
      const { run } = require("../../../lib/engine");

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
      const { run } = require("../../../lib/engine");

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
      const { run } = require("../../../lib/engine");

      const { results, hasError } = run({}, ["."]);
      expect(hasError).toEqual(false);
      expect(results).toHaveLength(0);
    })
  );

  it(
    "alerts user when no rules are being tracked",
    setup("no-rules", () => {
      const { run } = require("../../../lib/engine");

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
      const { run } = require("../../../lib/engine");

      run({}, []);
      expect(log.log).toHaveBeenCalledWith(
        `No files provided, running on full surface area...`
      );
      const record = readRecord(fixturePath);
      expect(record.files["index.js"]["no-console"]).toEqual(1);
    })
  );

  it(
    "creates new record when there wasn't one",
    setup("no-record", ({ fixturePath }) => {
      const { run } = require("../../../lib/engine");

      run({}, ["."]);
      const record = readRecord(fixturePath);
      expect(record.files["index.js"]["no-console"]).toEqual(1);
    })
  );

  it(
    "throws error if record is not valid json",
    setup("invalid-record", () => {
      const { run } = require("../../../lib/engine");

      expect(() => {
        run({}, ["."]);
      }).toThrowErrorMatchingSnapshot();
    })
  );

  it(
    "overwrites existing file is 'overwrite' is passed",
    setup("increase-warning", () => {
      const { run } = require("../../../lib/engine");
      const { results, hasError } = run({ overwrite: true }, ["index.js"]);
      expect(hasError).toEqual(false);
      expect(results).toHaveLength(0);
      expect(log.log).toHaveBeenCalledWith(
        "Overwriting existing the record file..."
      );
    })
  );

  it(
    "should throw error if config hashes don't match",
    setup("no-hash-match", () => {
      const { run } = require("../../../lib/engine");

      try {
        run({}, ["index.js"]);
        expect("It should never get here").toBe(false);
      } catch (e) {
        expect(stripAnsi(e.message)).toEqual(
          `✖ .esplint.rec.json was created using a different configuration.\nPlease use the --overwrite flag to re-generate your record file.`
        );
      }
    })
  );

  it(
    "handles new file with no error",
    setup("new-file", ({ fixturePath }) => {
      const { run } = require("../../../lib/engine");
      const { results, hasError } = run({}, ["newFile.js"]);
      expect(hasError).toEqual(false);
      expect(results).toHaveLength(0);

      const record = readRecord(fixturePath);
      expect(record.files["newFile.js"]).toEqual(undefined);
      expect(record.files["index.js"]).toEqual({
        "no-console": 1
      });
    })
  );

  it(
    "errors if new file has error",
    setup("new-file-with-error", () => {
      const { run } = require("../../../lib/engine");
      const { results, hasError } = run({}, ["."]);
      expect(hasError).toEqual(true);
      expect(results).toHaveLength(1);
    })
  );

  it(
    "sorts files",
    setup("sorts-files", ({ fixturePath }) => {
      const { run } = require("../../../lib/engine");
      const { results, hasError } = run({ overwrite: true }, ["."]);
      expect(hasError).toEqual(false);
      expect(results).toHaveLength(0);

      const record = readRecord(fixturePath);
      expect(Object.keys(record.files)).toEqual(["a.js", "b.js", "z.js"]);
    })
  );

  it(
    'does not update record if "write" option is false',
    setup("decrease-warning", ({ fixturePath }) => {
      const { run } = require("../../../lib/engine");

      run({ write: false }, []);
      expect(log.log).toHaveBeenCalledWith(
        `No files provided, running on full surface area...`
      );
      const record = readRecord(fixturePath);
      expect(record.files["index.js"]["no-console"]).toEqual(2);
    })
  );

  it(
    'still makes checks if "write" option is false',
    setup("increase-warning", () => {
      const { run } = require("../../../lib/engine");
      const { results, hasError } = run({ write: false }, ["index.js"]);
      expect(hasError).toEqual(true);
      expect(results).toHaveLength(1);
      expect(results[0].type).toEqual("error");
      expect(results[0]).toMatchSnapshot();
    })
  );

  it(
    "should throw error if record version is newer than current version",
    setup("new-version-decrease-warning", () => {
      const { run } = require("../../../lib/engine");

      try {
        run({}, ["."]);
        expect("It should never get here").toBe(false);
      } catch (e) {
        expect(stripAnsi(e.message)).toEqual(
          `✖ You are using an older "record version" of esplint (1) than what was used to create .esplint.rec.json (2).\nMake sure to upgrade esplint so you're on the same "record version" (or higher).`
        );
      }
    })
  );

  it(
    "should succeed and update to new record version if record version is older than current version",
    setup("old-version", ({ fixturePath }) => {
      const { run } = require("../../../lib/engine");
      const { results, hasError } = run({}, ["."]);
      expect(hasError).toEqual(false);
      expect(results).toHaveLength(0);

      const record = readRecord(fixturePath);
      expect(record.recordVersion).toEqual(1);
    })
  );

  it(
    "should throw error if record version is uses legacy version less than 0.4.1",
    setup("legacy-version-not-acceptable", () => {
      const { run } = require("../../../lib/engine");

      try {
        run({}, ["."]);
        expect("It should never get here").toBe(false);
      } catch (e) {
        expect(stripAnsi(e.message)).toEqual(
          `✖ Cannot determine the version of your record file or the version is too out-of-date.\nPlease use the --overwrite flag to re-generate your record file.`
        );
      }
    })
  );

  it(
    "should succeed and update to new record version if record version is legacy but >= 0.4.1",
    setup("legacy-version-acceptable", ({ fixturePath }) => {
      const { run } = require("../../../lib/engine");
      const { results, hasError } = run({}, ["."]);
      expect(hasError).toEqual(false);
      expect(results).toHaveLength(0);

      const record = readRecord(fixturePath);
      expect(record.recordVersion).toEqual(1);
    })
  );

  it(
    "should hide warnings when there are no violations in a file",
    setup("decrease-warning-hide-rule", ({ fixturePath }) => {
      const { run } = require("../../../lib/engine");
      const { results, hasError } = run({}, ["."]);
      expect(hasError).toEqual(false);
      expect(results).toHaveLength(1);
      expect(results[0].type).toEqual("info");
      expect(stripAnsi(results[0].message)).toEqual(
        'No "for-direction" warnings are being reported. You can turn it on as an error!'
      );

      // Hide warning
      const record = readRecord(fixturePath);
      expect(record.files["index.js"]["for-direction"]).toEqual(undefined);
    })
  );

  it(
    "should hide file if no longer has violations",
    setup("decrease-warning-in-other-file", ({ fixturePath }) => {
      const { run } = require("../../../lib/engine");
      const { results, hasError } = run({}, ["."]);
      expect(hasError).toEqual(false);
      expect(results).toHaveLength(0);

      // Hide file
      const record = readRecord(fixturePath);
      expect(record.files["other.js"]).toEqual(undefined);
      expect(record.files["index.js"]).toEqual({
        "no-console": 1
      });
    })
  );

  it(
    "should try to resolve merge conflicts in record file",
    setup("merge-conflict", ({ fixturePath }) => {
      const { run } = require("../../../lib/engine");
      const { results, hasError } = run({}, ["."]);
      expect(hasError).toEqual(false);
      expect(results).toHaveLength(0);
      expect(log.warn).toHaveBeenCalledWith(
        log.createWarning(
          "Attempting to auto resolve git conflicts find in .esplint.rec.json."
        )
      );

      const record = readRecord(fixturePath);
      expect(record.files).toEqual({
        "z.js": {
          "no-console": 1
        }
      });
    })
  );
});
