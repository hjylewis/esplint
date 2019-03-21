const cli = require("../../lib/cli");
const { getRuleStats } = require("../../lib/engine");
const log = require("../../lib/log");
const stripAnsi = require("strip-ansi");

jest.mock("../../lib/engine");
jest.mock("../../lib/log");
process.exit = jest.fn();

beforeEach(() => {
  getRuleStats.mockReset();

  process.argv = [];
  process.exit.mockReset();
  log.error.mockReset();
  log.log.mockReset();
  log.warn.mockReset();
});

it("should print warning when record file doesn't exist", () => {
  getRuleStats.mockReturnValue(null);
  cli(["stats"]);

  expect(log.warn).toHaveBeenCalledWith(
    log.createWarning(
      'esplint cannot find ".esplint.rec.json". Try running esplint first.'
    )
  );
});

it("should print the count and list files per rule", () => {
  getRuleStats.mockReturnValue({
    "no-console": {
      count: 2,
      files: ["index.js", "not-index.js"]
    },
    "other-rule": {
      count: 100,
      files: ["file.js", "other-file.js", "other-other-file.js"]
    },
    "no-violations": {
      count: 0,
      files: []
    }
  });
  cli(["stats"]);

  expect(log.log).toHaveBeenCalled();
  const output = stripAnsi(log.log.mock.calls[0][0])
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const expectedOutput = [
    /"no-console": 2/,
    /index\.js/,
    /not-index\.js/,

    /"no-violations": 0/,
    /No files/,

    /"other-rule": 100/,
    /file\.js/,
    /other-file\.js/,
    /other-other-file\.js/,

    /Total: 102/
  ];

  output.forEach((line, i) => {
    expect(line).toMatch(expectedOutput[i]);
  });
});

it("should print the count and list files per rule", () => {
  getRuleStats.mockReturnValue({
    "no-console": {
      count: 0,
      files: []
    },
    "other-rule": {
      count: 0,
      files: []
    },
    "no-violations": {
      count: 0,
      files: []
    }
  });
  cli(["stats"]);

  expect(log.log).toHaveBeenCalled();
  const output = stripAnsi(log.log.mock.calls[0][0])
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const expectedOutput = [
    /"no-console": 0/,
    /No files/,

    /"no-violations": 0/,
    /No files/,

    /"other-rule": 0/,
    /No files/,

    /No violations!/
  ];

  output.forEach((line, i) => {
    expect(line).toMatch(expectedOutput[i]);
  });
});
