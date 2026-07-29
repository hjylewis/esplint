const {
  filterToSurfaceArea,
  filterEslintIgnored,
  relativeToCwd,
} = require("../lib/changedFiles");

describe("filterToSurfaceArea", () => {
  it('treats "." as the whole tree', () => {
    expect(
      filterToSurfaceArea(["a.js", "src/b.ts", "deep/nested/c.tsx"], ["."])
    ).toEqual(["a.js", "src/b.ts", "deep/nested/c.tsx"]);
  });

  it("limits to a directory", () => {
    expect(
      filterToSurfaceArea(
        ["scripts/a.js", "src/b.ts", "scripts/deep/c.js"],
        ["./scripts"]
      )
    ).toEqual(["scripts/a.js", "scripts/deep/c.js"]);
  });

  it("applies globs, including extension groups", () => {
    expect(
      filterToSurfaceArea(
        [
          "src/a.ts",
          "src/b/c.tsx",
          "src/d.snap",
          "src/e.js",
          "scripts/f.ts",
          "config/g.ts",
        ],
        ["./src/**/*{.ts,.tsx,.snap}"]
      )
    ).toEqual(["src/a.ts", "src/b/c.tsx", "src/d.snap"]);
  });

  it("keeps a file matching any one of several entries", () => {
    expect(
      filterToSurfaceArea(
        ["src/a.js", "lib/b.js", "other/c.js"],
        ["./src", "./lib"]
      )
    ).toEqual(["src/a.js", "lib/b.js"]);
  });

  it("returns nothing when no changed file is in scope", () => {
    expect(filterToSurfaceArea(["scripts/a.js"], ["./src"])).toEqual([]);
  });
});

describe("filterEslintIgnored", () => {
  it("drops files ESLint would ignore", async () => {
    // Linting an ignored file yields a result with no ruleId, which would
    // create an empty record entry and wipe that file's real counts.
    const eslint = {
      isPathIgnored: (file) => Promise.resolve(file === "src/ignored.js"),
    };

    expect(
      await filterEslintIgnored(["src/a.js", "src/ignored.js"], eslint)
    ).toEqual(["src/a.js"]);
  });

  it("keeps the file when ESLint can't decide", async () => {
    const eslint = {
      isPathIgnored: () => Promise.reject(new Error("boom")),
    };

    expect(await filterEslintIgnored(["src/a.js"], eslint)).toEqual([
      "src/a.js",
    ]);
  });
});

describe("relativeToCwd", () => {
  it("makes absolute paths relative and normalizes separators", () => {
    expect(relativeToCwd(["/repo/src/a.js"], "/repo")).toEqual(["src/a.js"]);
  });

  it("leaves relative paths alone", () => {
    expect(relativeToCwd(["src/a.js"], "/repo")).toEqual(["src/a.js"]);
  });
});
