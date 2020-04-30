const { toPosixPath, toSystemPath, toWinPath } = require("../lib/pathUtils");
const helpers = require("../lib/helpers");

describe("toPosixPath", function() {
  it("should convert windows to posix paths", () => {
    expect(toPosixPath("\\windows\\path")).toEqual("/windows/path");
  });
  it("should not alter posix paths", () => {
    expect(toPosixPath("/posix/path")).toEqual("/posix/path");
  });
});

describe("toWinPath", function() {
  it("should convert posix to windows path", () => {
    expect(toWinPath("/posix/path")).toEqual("\\posix\\path");
  });
  it("not alter windows path", () => {
    expect(toWinPath("\\windows\\path")).toEqual("\\windows\\path");
  });
});

describe("toSystemPath", () => {
  it("should convert posix to windows on windows", () => {
    jest.spyOn(helpers, "isPosix").mockImplementation(() => false);
    expect(toSystemPath("/posix/path")).toEqual("\\posix\\path");
  });
  it("should convert windows to posix on posix", () => {
    jest.spyOn(helpers, "isPosix").mockImplementation(() => true);
    expect(toSystemPath("\\windows\\path")).toEqual("/windows/path");
  });
});
