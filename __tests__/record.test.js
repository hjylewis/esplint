const { createRecord } = require("../lib/record");
jest.mock("../package.json", () => ({ version: "1.0.0" }));

describe("createRecord", () => {
  it("attaches current version", () => {
    const { version } = createRecord({ config: { rules: [] }, files: {} });
    expect(version).toEqual("1.0.0");
  });

  it("sorts files", () => {
    const { files } = createRecord({
      config: { rules: [] },
      files: {
        "z/a/c": {},
        "b/b/c": {},
        "a/b/c": {}
      }
    });
    expect(Object.keys(files)).toEqual(["a/b/c", "b/b/c", "z/a/c"]);
  });
});
