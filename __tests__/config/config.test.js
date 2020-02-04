const path = require("path");
const { getConfig } = require("../../lib/config");

describe("getConfig", function() {
  it("should load config from another directory", function() {
    const workingDir = path.resolve(__dirname, "./fixtures");
    const expectedResult = {
      surfaceArea: ["."],
      eslint: {},
      rules: ["no-console"],
      write: true,
      overwrite: false,
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
});
