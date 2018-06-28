const { createRecord } = require("../lib/record");
jest.mock("../package.json", () => ({ version: "1.0.0" }));

describe("createRecord", () => {
  it("attaches current version", () => {
    const { version } = createRecord();
    expect(version).toEqual("1.0.0");
  });

  it("combines file sets", () => {
    const { files } = createRecord(
      {
        files: {}
      },
      { "foo.js": {} }
    );
    expect(files).toEqual({ "foo.js": {} });
  });
});
