const cli = require("../../lib/cli");
const { run } = require("../../lib/engine");
const log = require("../../lib/log");
const stripAnsi = require("strip-ansi");
const EsplintError = require("../../lib/EsplintError");
const git = require("simple-git");

jest.mock("../../lib/engine");
jest.mock("../../lib/log");
jest.mock("simple-git", () => {
  const gitAdd = jest.fn();
  return () => ({
    add: gitAdd
  });
});
process.exit = jest.fn();

beforeEach(() => {
  run.mockReset();
  run.mockImplementation(() => ({
    results: [],
    hasError: false
  }));

  process.argv = [];
  process.exit.mockReset();
  log.error.mockReset();
  log.log.mockReset();
  log.warn.mockReset();
  log.createError.mockReset();
});

it("should strip ignore first two arguments of process.argv", () => {
  process.argv = ["node", "esplint", "foo.js", "bar/baz.js"];
  cli();

  expect(run).toHaveBeenCalledWith(expect.anything(), ["foo.js", "bar/baz.js"]);
});

it("should pass files to engine", () => {
  cli(["foo.js", "bar/baz.js"]);

  expect(run).toHaveBeenCalledWith(expect.anything(), ["foo.js", "bar/baz.js"]);
});

it("should pass default options to engine", () => {
  cli([]);

  expect(run).toHaveBeenCalledWith(
    { write: true, overwrite: false, stageRecordFile: false },
    expect.anything()
  );
});

it("should pass --no-write option to engine", () => {
  cli(["--no-write"]);

  expect(run.mock.calls[0][0].write).toEqual(false);
});

it("should pass --overwrite option to engine", () => {
  cli(["--overwrite"]);

  expect(run.mock.calls[0][0].overwrite).toEqual(true);
});

it("should print exception and exit with error code", () => {
  const error = new Error("this is an error");
  run.mockImplementation(() => {
    throw error;
  });
  cli([]);

  expect(log.error).toHaveBeenCalledWith(error);
  expect(process.exit).toHaveBeenCalledWith(1);
});

it("should print message of EsplintError and exit with error code", () => {
  log.createError.mockImplementation(i => i);
  run.mockImplementation(() => {
    throw new EsplintError("this is an error");
  });
  cli([]);

  expect(log.createError).toHaveBeenCalledWith("this is an error");
  expect(log.error).toHaveBeenCalledWith("this is an error");
  expect(process.exit).toHaveBeenCalledWith(1);
});

it("should print tip and exit with error code if there was an error", async () => {
  const runPromise = Promise.resolve({
    results: [],
    hasError: true
  });
  run.mockReturnValue(runPromise);
  cli([]);

  await runPromise;

  expect(stripAnsi(log.log.mock.calls[0][0]).trim()).toEqual(
    "Use the --overwrite flag to ignore these errors and force the record to be rewritten."
  );
  expect(process.exit).toHaveBeenCalledWith(1);
});

it("should show success message if no errors", async () => {
  const runPromise = Promise.resolve({
    results: [
      {
        type: "info",
        message: "this is info"
      }
    ],
    hasError: false
  });
  run.mockReturnValue(runPromise);
  cli([]);

  await runPromise;

  expect(log.log).toHaveBeenCalledWith(log.createSuccess("Looking good!"));
});

it("should show success message if the only results are info types", async () => {
  const runPromise = Promise.resolve({
    results: [],
    hasError: false
  });
  run.mockReturnValue(runPromise);
  cli([]);

  await runPromise;

  expect(log.log).toHaveBeenCalledWith(log.createSuccess("Looking good!"));
});

it("should stage record file if flag is passed", async () => {
  const runPromise = Promise.resolve({
    results: [],
    hasError: false
  });
  run.mockReturnValue(runPromise);
  const gitAddPromise = Promise.resolve();
  git().add.mockReturnValue(gitAddPromise);

  cli(["--stage-record-file"]);

  await runPromise;
  await gitAddPromise;

  expect(log.log).toHaveBeenCalledWith(
    "Running `git add .esplint.rec.json`..."
  );
  expect(git().add).toHaveBeenCalledTimes(1);
  expect(git().add).toHaveBeenCalledWith([
    expect.stringContaining(".esplint.rec.json")
  ]);
  expect(log.log).toHaveBeenCalledWith("Record file staged.");
});

it("should properly log the results", async () => {
  const runPromise = Promise.resolve({
    results: [
      {
        type: "error",
        message: "this is an error"
      },
      {
        type: "warning",
        message: "this is an warning"
      },
      {
        type: "info",
        message: "this is info"
      }
    ],
    hasError: true
  });
  run.mockReturnValue(runPromise);

  cli([]);

  await runPromise;

  expect(log.error).toHaveBeenCalledWith(log.createError("this is an error"));
  expect(log.warn).toHaveBeenCalledWith(
    log.createWarning("this is an warning")
  );
  expect(log.log).toHaveBeenCalledWith("this is info");
});
