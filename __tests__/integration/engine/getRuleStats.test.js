const { fixtureInit } = require("../util");

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
        total: 2,
        rules: {
          "no-console": {
            count: 2,
            files: ["index.js", "not-index.js"]
          }
        }
      });
    })
  );

  it(
    "should include rules with 0 violations",
    setup("zero-warnings", () => {
      const { getRuleStats } = require("../../../lib/engine");
      expect(getRuleStats()).toEqual({
        total: 0,
        rules: {
          "no-console": {
            count: 0,
            files: []
          }
        }
      });
    })
  );
});
