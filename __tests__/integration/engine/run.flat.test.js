const log = require("../../../lib/log");
const stripAnsi = require("strip-ansi");
const { fixtureInit } = require("../util");
jest.mock("../../../package.json", () => ({ version: "1.0.0" }));

// Same engine flows as run.test.js, but the fixtures use flat config
// (eslint.config.js) instead of legacy .eslintrc.js. esplint auto-detects the
// flat config file and drives ESLint accordingly.
const { setup, readRecord, onBeforeAll, onAfterEach, onAfterAll } = fixtureInit(
  "engine.run.flat",
  "./__tests__/integration/fixtures-flat"
);

log.log = jest.fn();
log.error = jest.fn();
log.warn = jest.fn();

describe("engine.run (flat config)", () => {
  beforeAll(onBeforeAll);

  afterEach(onAfterEach);

  afterAll(onAfterAll);

  it(
    "throws error if eslint error",
    setup("eslint-error", async () => {
      const { run } = require("../../../lib/engine");
      try {
        await run({}, ["index.js"]);
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
    setup("increase-warning", async () => {
      const { run } = require("../../../lib/engine");
      const { results, hasError } = await run({}, ["index.js"]);
      expect(hasError).toEqual(true);
      expect(results).toHaveLength(1);
      expect(results[0].type).toEqual("error");
      expect(stripAnsi(results[0].message)).toEqual(
        'Warnings of "no-console" have increased by +1 in "index.js"'
      );
    })
  );

  it(
    "no errors and changes record count when warnings decrease",
    setup("decrease-warning", async ({ fixturePath }) => {
      const { run } = require("../../../lib/engine");
      const { results, hasError } = await run({}, ["index.js"]);
      expect(hasError).toEqual(false);
      expect(results).toHaveLength(0);

      const record = readRecord(fixturePath);
      expect(record.files["index.js"]["no-console"]).toEqual(1);
    })
  );

  it(
    "handles new file with no error",
    setup("new-file", async ({ fixturePath }) => {
      const { run } = require("../../../lib/engine");
      const { results, hasError } = await run({}, ["newFile.js"]);
      expect(hasError).toEqual(false);
      expect(results).toHaveLength(0);

      const record = readRecord(fixturePath);
      expect(record.files["newFile.js"]).toEqual(undefined);
      expect(record.files["index.js"]).toEqual({
        "no-console": 1,
      });
    })
  );

  it(
    "errors if new file has error",
    setup("new-file-with-error", async () => {
      const { run } = require("../../../lib/engine");
      const { results, hasError } = await run({}, ["."]);
      expect(hasError).toEqual(true);
      expect(results).toHaveLength(1);
    })
  );

  it(
    "should hide warnings when there are no violations in a file",
    setup("decrease-warning-hide-rule", async ({ fixturePath }) => {
      const { run } = require("../../../lib/engine");
      const { results, hasError } = await run({}, ["."]);
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
});
