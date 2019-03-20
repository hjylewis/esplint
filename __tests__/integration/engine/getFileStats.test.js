const { fixtureInit } = require("../util");

const { setup, onBeforeAll, onAfterEach, onAfterAll } = fixtureInit(
  "engine.getFileStats"
);

describe("engine.getFileStats", () => {
  beforeAll(onBeforeAll);

  afterEach(onAfterEach);

  afterAll(onAfterAll);

  it(
    "should return null if no record file",
    setup("no-record", () => {
      const { getFileStats } = require("../../../lib/engine");
      expect(getFileStats()).toBe(null);
    })
  );

  it(
    "should return file object from record file",
    setup("delete-file", () => {
      const { getFileStats } = require("../../../lib/engine");
      expect(getFileStats()).toEqual({
        "index.js": {
          "no-console": 1
        },
        "not-index.js": {
          "no-console": 1
        }
      });
    })
  );
});
