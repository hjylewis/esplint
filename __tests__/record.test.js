const { createRecord, unifyFilePaths } = require("../lib/record");
jest.mock("../package.json", () => ({ version: "1.0.0" }));

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

describe("unifyFilePaths", () => {
  it("converts windows paths to posix", () => {
    const record = {
      hash: "aabbcc",
      files: {
        "\\windows\\path.js": {},
        "\\another\\windows\\path.js": {}
      }
    };
    const unifiedRecord = unifyFilePaths(record);
    expect(unifiedRecord).toEqual({
      hash: "aabbcc",
      files: {
        "/windows/path.js": {},
        "/another/windows/path.js": {}
      }
    });
  });
  it("keeps posix paths as posix", () => {
    const record = {
      hash: "aabbcc",
      files: {
        "/windows/path.js": {},
        "/another/windows/path.js": {}
      }
    };
    const unifiedRecord = unifyFilePaths(record);
    expect(unifiedRecord).toEqual(record);
  });
});
