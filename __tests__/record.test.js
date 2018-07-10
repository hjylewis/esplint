const { createRecord } = require("../lib/record");
jest.mock("../package.json", () => ({ version: "1.0.0" }));

describe("createRecord", () => {
  it("attaches current version", () => {
    const { version } = createRecord({ config: { rules: [] } });
    expect(version).toEqual("1.0.0");
  });
});
