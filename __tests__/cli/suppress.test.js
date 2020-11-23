const cli = require("../../lib/cli");
const { suppress } = require("../../lib/engine");
const log = require("../../lib/log");

jest.mock("../../lib/engine");
jest.mock("../../lib/log");
process.exit = jest.fn();
console.error = jest.fn();

beforeEach(() => {
  suppress.mockReset();
  process.argv = [];
  process.exit.mockReset();
  log.error.mockReset();
  log.log.mockReset();
  log.warn.mockReset();
});

it("should pass files and a rule to suppress", async () => {
  const suppressPromise = Promise.resolve();
  suppress.mockReturnValue(suppressPromise);
  cli(["suppress", "no-console", "file", "file2"]);

  await suppressPromise;

  expect(suppress).toHaveBeenCalledWith(["no-console"], ["file", "file2"]);
  expect(log.log).toHaveBeenCalledWith(log.createSuccess("Done!"));
});

it("should pass multiple rules to suppress", async () => {
  const suppressPromise = Promise.resolve();
  suppress.mockReturnValue(suppressPromise);
  cli(["suppress", '"no-console, semi"']);

  await suppressPromise;

  expect(suppress).toHaveBeenCalledWith(["no-console", "semi"], []);
  expect(log.log).toHaveBeenCalledWith(log.createSuccess("Done!"));
});

it("should require at least one rule", () => {
  cli(["suppress"]);
  expect(suppress).not.toHaveBeenCalled();
});
