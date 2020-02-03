const path = require("path");
const { createRecord, readRecord } = require("../../lib/record");
jest.mock("../../package.json", () => ({ version: "1.0.0" }));

describe("createRecord", () => {
  it("attaches current version", () => {
    const { recordVersion } = createRecord({
      config: { rules: [], __originalConfig: { rules: [] } },
      files: {}
    });
    expect(recordVersion).toEqual(1);
  });

  it("sorts files", () => {
    const { files } = createRecord({
      config: { rules: [], __originalConfig: { rules: [] } },
      files: {
        "z/a/c": {
          rule: 1
        },
        "b/b/c": {
          rule: 1
        },
        "a/b/c": {
          rule: 1
        }
      }
    });
    expect(Object.keys(files)).toEqual(["a/b/c", "b/b/c", "z/a/c"]);
  });
});

describe("readRecord", () => {
  it("should read record from another directory", () => {
    const expectedResult = {
      recordVersion: 1,
      configHash: "773a8b36f5d74ada1b0144c983a6d725c71c9413",
      files: {}
    };
    const workingDir = path.resolve(__dirname, "./fixtures");
    const result = readRecord({ workingDir });
    expect(result).toEqual(expectedResult);
  });
  it("should read record from root directory", () => {
    const oldDir = process.cwd();
    const expectedResult = {
      recordVersion: 1,
      configHash: "773a8b36f5d74ada1b0144c983a6d725c71c9413",
      files: {}
    };
    process.chdir(path.resolve(__dirname, "./fixtures"));
    const result = readRecord();
    expect(result).toEqual(expectedResult);
    process.chdir(oldDir);
  });
});
