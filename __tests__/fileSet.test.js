const {
  combineFileSets,
  compareFileSets,
  createFileSet
} = require("../lib/fileSet");

describe("combineFileSets", () => {
  it("combines FileSets", () => {
    const result = combineFileSets(
      {
        "foobar.js": {
          rule: 10
        }
      },
      {
        "foobar.js": {
          rule: 8
        }
      }
    );

    expect(result["foobar.js"].rule).toBe(8);
  });
});

describe("compareFileSets", () => {
  it("returns an error for each rule that increases", () => {
    const result = compareFileSets(
      {
        "foo.js": {
          rule1: 10,
          rule2: 10
        },
        "bar.js": {
          rule3: 10
        }
      },
      {
        "foo.js": {
          rule1: 12,
          rule2: 10
        },
        "bar.js": {
          rule3: 12
        }
      }
    );

    expect(result).toHaveLength(2);
  });

  it("returns an error if rule surfaces", () => {
    const result = compareFileSets(
      {},
      {
        "bar.js": {
          rule: 1
        }
      }
    );

    expect(result).toHaveLength(1);
  });
});

describe("createFileSet", () => {
  it("counts rule violations per file", () => {
    process.cwd = () => "/absolute/path";
    const result = createFileSet([
      {
        filePath: "/absolute/path/foo.js",
        messages: [
          { ruleId: "rule1" },
          { ruleId: "rule1" },
          { ruleId: "rule1" }
        ]
      },
      {
        filePath: "/absolute/path/bar.js",
        messages: [
          { ruleId: "rule1" },
          { ruleId: "rule2" },
          { ruleId: "rule3" }
        ]
      }
    ]);

    expect(result).toEqual({
      "foo.js": {
        rule1: 3
      },
      "bar.js": {
        rule1: 1,
        rule2: 1,
        rule3: 1
      }
    });
  });
});
