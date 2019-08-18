const log = require("../../../lib/log");
const { fixtureInit } = require("../util");

log.log = jest.fn();
log.error = jest.fn();
log.warn = jest.fn();

const { setup, onBeforeAll, onAfterEach, onAfterAll } = fixtureInit(
  "engine.getRuleStats"
);

describe("engine.getRuleStats", () => {
  beforeAll(onBeforeAll);

  afterEach(onAfterEach);

  afterAll(onAfterAll);

  it(
    "should return null if no record file",
    setup("no-record", () => {
      const { getRuleStats } = require("../../../lib/engine");
      expect(getRuleStats()).toBe(null);
    })
  );

  it(
    "should return formatted rule stats object from record file",
    setup("delete-file", () => {
      const { getRuleStats } = require("../../../lib/engine");
      expect(getRuleStats()).toEqual({
        "no-console": {
          count: 2,
          files: ["index.js", "not-index.js"]
        }
      });
    })
  );

  it(
    "should include rules with 0 violations",
    setup("zero-warnings", () => {
      const { getRuleStats } = require("../../../lib/engine");
      expect(getRuleStats()).toEqual({
        "no-console": {
          count: 0,
          files: []
        }
      });
    })
  );

  it(
    "should ignore rules no longer configured to be tracked",
    setup("no-tracked", () => {
      const { getRuleStats } = require("../../../lib/engine");
      expect(getRuleStats()).toEqual({});
    })
  );
});
