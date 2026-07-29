const { createRecord, unifyFilePaths } = require("../lib/record");
jest.mock("../package.json", () => ({ version: "1.0.0" }));

describe("createRecord", () => {
  it("attaches current version", () => {
    const { recordVersion } = createRecord({
      config: { rules: [], __originalConfig: { rules: [] } },
      files: {},
    });
    expect(recordVersion).toEqual(1);
  });

  it("sorts files", () => {
    const { files } = createRecord({
      config: { rules: [], __originalConfig: { rules: [] } },
      files: {
        "z/a/c": {
          rule: 1,
        },
        "b/b/c": {
          rule: 1,
        },
        "a/b/c": {
          rule: 1,
        },
      },
    });
    expect(Object.keys(files)).toEqual(["a/b/c", "b/b/c", "z/a/c"]);
  });

  it("records the tracked rules, sorted", () => {
    const { trackedRules } = createRecord({
      config: {
        rules: ["no-console", "eqeqeq"],
        __originalConfig: { rules: ["no-console", "eqeqeq"] },
      },
      files: {},
    });
    expect(trackedRules).toEqual(["eqeqeq", "no-console"]);
  });

  it("hashes only count-affecting config, ignoring unrelated keys", () => {
    const base = { surfaceArea: ["."], eslint: {}, rules: ["no-console"] };
    const hashOf = (originalConfig) =>
      createRecord({
        config: {
          rules: originalConfig.rules,
          __originalConfig: originalConfig,
        },
        files: {},
      }).configHash;

    // Changing the tracked rules must NOT change the hash: rules are tracked
    // separately so adding one doesn't invalidate the other rules' baselines.
    expect(hashOf({ ...base, rules: ["no-console", "eqeqeq"] })).toEqual(
      hashOf(base)
    );

    // Neither should a key that can't affect counts.
    expect(hashOf({ ...base, write: false })).toEqual(hashOf(base));

    // But surfaceArea and eslint options can change counts anywhere.
    expect(hashOf({ ...base, surfaceArea: ["./src"] })).not.toEqual(
      hashOf(base)
    );
    expect(hashOf({ ...base, eslint: { ignore: false } })).not.toEqual(
      hashOf(base)
    );
  });
});

describe("unifyFilePaths", () => {
  it("converts windows paths to posix", () => {
    const record = {
      hash: "aabbcc",
      files: {
        "\\windows\\path.js": {},
        "\\another\\windows\\path.js": {},
      },
    };
    const unifiedRecord = unifyFilePaths(record);
    expect(unifiedRecord).toEqual({
      hash: "aabbcc",
      files: {
        "/windows/path.js": {},
        "/another/windows/path.js": {},
      },
    });
  });
  it("keeps posix paths as posix", () => {
    const record = {
      hash: "aabbcc",
      files: {
        "/windows/path.js": {},
        "/another/windows/path.js": {},
      },
    };
    const unifiedRecord = unifyFilePaths(record);
    expect(unifiedRecord).toEqual(record);
  });
});
