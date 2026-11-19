const { fixtureInit } = require("../util");

// Same suppress flows as suppress.test.js, but against flat-config
// (eslint.config.js) fixtures.
const { setup, readFile, onBeforeAll, onAfterEach, onAfterAll } = fixtureInit(
  "engine.suppress.flat",
  "./__tests__/integration/fixtures-flat"
);

// Flat config needs ESLint >=8.57 (`loadESLint`). Skip on older versions.
const describeFlat =
  typeof require("eslint").loadESLint === "function" ? describe : describe.skip;

describeFlat("engine.suppress (flat config)", () => {
  beforeAll(onBeforeAll);

  afterEach(onAfterEach);

  afterAll(onAfterAll);

  it(
    "should insert a disable-eslint comment before each violation",
    setup("increase-warning", async ({ fixturePath }) => {
      const { suppress } = require("../../../lib/engine");
      await suppress(["no-console"], ["."]);

      const lines = readFile(fixturePath, "index.js")
        .split("\n")
        .filter((l) => l.length > 0);
      expect(lines).toEqual([
        "// FIXME: The next line was auto suppressed by esplint",
        "// eslint-disable-next-line no-console",
        'console.log("");',
        "// FIXME: The next line was auto suppressed by esplint",
        "// eslint-disable-next-line no-console",
        'console.log("");',
      ]);
    })
  );

  it(
    "should insert disable-eslint comment for multiple files",
    setup("multiple-files-no-record", async ({ fixturePath }) => {
      const { suppress } = require("../../../lib/engine");
      await suppress(["no-console"], ["."]);

      ["index.js", "anotherFile.js"].forEach((filename) => {
        const lines = readFile(fixturePath, filename)
          .split("\n")
          .filter((l) => l.length > 0);
        expect(lines).toEqual([
          "// FIXME: The next line was auto suppressed by esplint",
          "// eslint-disable-next-line no-console",
          'console.log("");',
          "// FIXME: The next line was auto suppressed by esplint",
          "// eslint-disable-next-line no-console",
          'console.log("");',
        ]);
      });
    })
  );

  it(
    "should insert disable-eslint comment for multiple rules",
    setup("extra-semi", async ({ fixturePath }) => {
      const { suppress } = require("../../../lib/engine");
      await suppress(["no-console", "no-extra-semi"], ["."]);

      const lines = readFile(fixturePath, "index.js")
        .split("\n")
        .filter((l) => l.length > 0);
      expect(lines).toEqual([
        "// FIXME: The next line was auto suppressed by esplint",
        "// eslint-disable-next-line no-console, no-extra-semi",
        'console.log("");;',
      ]);
    })
  );

  it(
    "should preserve existing disable-eslint comments",
    setup("suppressed-extra-semi", async ({ fixturePath }) => {
      const { suppress } = require("../../../lib/engine");
      await suppress(["no-console", "no-extra-semi"], ["."]);

      const lines = readFile(fixturePath, "index.js")
        .split("\n")
        .filter((l) => l.length > 0);
      expect(lines).toEqual([
        "// FIXME: The next line was auto suppressed by esplint",
        "// eslint-disable-next-line no-console, no-extra-semi",
        'console.log("");;',
      ]);
    })
  );

  it(
    "should preserve leading whitespace",
    setup("new-file-with-error", async ({ fixturePath }) => {
      const { suppress } = require("../../../lib/engine");
      await suppress(["no-console"], ["."]);

      const lines = readFile(fixturePath, "newFile.js")
        .split("\n")
        .filter((l) => l.length > 0);
      expect(lines).toEqual([
        "function newFile() {",
        "  // FIXME: The next line was auto suppressed by esplint",
        "  // eslint-disable-next-line no-console",
        "  console.log();",
        "}",
        "newFile();",
      ]);
    })
  );

  it(
    "should respect eslint configuration",
    setup("config-with-globals", async ({ fixturePath }) => {
      const { suppress } = require("../../../lib/engine");
      await suppress(["no-undef"], ["."]);

      const lines = readFile(fixturePath, "index.js")
        .split("\n")
        .filter((l) => l.length > 0);
      expect(lines).toEqual(["undefinedGlobal;"]);
    })
  );

  it(
    "should use the eslint options from the esplint config",
    // index.js uses ESM syntax, so it only parses if suppress loads the flat
    // config named in the esplint config's `eslint` options.
    setup("custom-config-file", async ({ fixturePath }) => {
      const { suppress } = require("../../../lib/engine");
      await suppress(["no-console"], ["."]);

      const lines = readFile(fixturePath, "index.js")
        .split("\n")
        .filter((l) => l.length > 0);
      expect(lines).toEqual([
        'import x from "./x.js";',
        "// FIXME: The next line was auto suppressed by esplint",
        "// eslint-disable-next-line no-console",
        "console.log(x);",
      ]);
    })
  );
});
