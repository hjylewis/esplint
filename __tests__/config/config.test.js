const path = require("path");
const { getConfig } = require("../../lib/config");

const throwShouldFailError = function() {
  throw new Error("should fail with error");
};
describe("getConfig", function() {
  it("should load config from another directory", function() {
    const workingDir = path.resolve(__dirname, "./fixtures");
    const expectedResult = {
      surfaceArea: ["."],
      eslint: {},
      rules: ["no-console"],
      write: true,
      overwrite: false,
      reduceWarningsBy: 0,
      workingDir,
      __originalConfig: {
        surfaceArea: ["."],
        rules: ["no-console"]
      }
    };
    const result = getConfig({ workingDir });
    expect(result).toEqual(expectedResult);
  });
  it("should load config from the current directory", function() {
    const oldDir = process.cwd();
    process.chdir(path.resolve(__dirname, "./fixtures"));
    const expectedResult = {
      surfaceArea: ["."],
      eslint: {},
      rules: ["no-console"],
      reduceWarningsBy: 0,
      write: true,
      overwrite: false,
      __originalConfig: {
        surfaceArea: ["."],
        rules: ["no-console"]
      }
    };
    const result = getConfig();
    expect(result).toEqual(expectedResult);
    process.chdir(oldDir);
  });
  it("should load config with reduceWarningsBy", function() {
    const workingDir = path.resolve(__dirname, "reduceWarningsBy");
    const { result } = getConfig({ workingDir });
    expect(result.reduceWarningsBy).toEqual(0.5);
  });
  it("should throw error if reduceWarningsBy is not a number", function() {
    const workingDir = path.resolve(__dirname, "reduceWarningsBy-NAN");
    try {
      getConfig({ workingDir });
      throwShouldFailError();
    } catch (error) {
      expect(error.toString()).toEqual(
        "EsplintError: reduceWarningsBy should be a number"
      );
    }
  });
  it("should throw error if reduceWarningsBy is greater than 1", function() {
    const workingDir = path.resolve(
      __dirname,
      "./fixtures/reduceWarningsBy-greater-than-1"
    );
    try {
      getConfig({ workingDir });
      throwShouldFailError();
    } catch (error) {
      expect(error.toString()).toEqual(
        "EsplintError: reduceWarningsBy should never be greater than 1; this implies a percentage greater than 100"
      );
    }
  });
  it("should throw error if reduceWarningsBy is negative", function() {
    const workingDir = path.resolve(
      __dirname,
      "./fixtures/reduceWarningsBy-negative"
    );
    try {
      getConfig({ workingDir });
      throwShouldFailError();
    } catch (error) {
      expect(error.toString()).toEqual(
        "reduceWarningsBy should never be negative"
      );
    }
  });
});
