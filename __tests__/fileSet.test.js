const {
  combineFileSets,
  compareFileSets,
  createFileSet,
  cleanUpDeletedFilesInFileSet,
  cleanUpWarninglessFilesInFileSet,
  sortFileSet
} = require("../lib/fileSet");
const fs = require("fs");
jest.mock("fs");

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
  it("returns an error for each rule that is picked up by the warningsIncreased guard", () => {
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
  it("should return an error for each rule that is picked up by the warningsIncreased and warningsReduced guards", () => {
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
      },
      {
        reduceWarningsBy: 0.5,
        guards: ["warningsReducedBy"]
      }
    );
    expect(result).toHaveLength(5);
  });
  it("should not return an error for rules that pass the warningsReduced guards", () => {
    const result = compareFileSets(
      {
        "foo.js": {
          rule1: 10,
          rule2: 10
        }
      },
      {
        "foo.js": {
          rule1: 4,
          rule2: 4
        }
      },
      {
        guards: ["warningsReducedBy"],
        reduceWarningsBy: 0.5
      }
    );
    expect(result).toHaveLength(0);
  });
  it("should return an error if warnings are not reduced", () => {
    const result = compareFileSets(
      {
        "foo.js": {
          rule1: 10
        }
      },
      {
        "foo.js": {
          rule1: 10
        }
      },
      {
        reduceWarningsBy: 0.5,
        guards: ["warningsReducedBy"]
      }
    );
    expect(result).toHaveLength(1);
  });
  it("should return an error if warnings not reduced but not by the given value", () => {
    const result = compareFileSets(
      {
        "foo.js": {
          rule1: 10
        }
      },
      {
        "foo.js": {
          rule1: 9
        }
      },
      {
        reduceWarningsBy: 0.5,
        guards: ["warningsReducedBy"]
      }
    );
    expect(result).toHaveLength(1);
  });
  it("should not return an error if warnings are reduced by the given value", () => {
    const result = compareFileSets(
      {
        "foo.js": {
          rule1: 10
        }
      },
      {
        "foo.js": {
          rule1: 4
        }
      },
      {
        reduceWarningsBy: 0.5,
        guards: ["warningsReducedBy"]
      }
    );
    expect(result).toHaveLength(0);
  });
  it("should not return an error if warnings are completely removed", () => {
    const result = compareFileSets(
      {
        "foo.js": {
          rule1: 10
        }
      },
      {
        "foo.js": {
          rule1: 0
        }
      },
      {
        reduceWarningsBy: 0.5,
        guards: ["warningsReducedBy"]
      }
    );
    expect(result).toHaveLength(0);
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

  it("returns nothing is old fileSet doesn't exist", () => {
    const result = compareFileSets(null, {
      "bar.js": {
        rule: 1
      }
    });

    expect(result).toHaveLength(0);
  });
});

describe("createFileSet", () => {
  process.cwd = () => "/absolute/path";

  it("counts rule violations per file", () => {
    const result = createFileSet(
      [
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
      ],
      ["rule1", "rule2", "rule3"]
    );

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

  it("defaults give rules to 0", () => {
    const result = createFileSet(
      [
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
          messages: []
        }
      ],
      ["rule1", "rule2"],
      filename => {
        return filename === "foo.js" ? ["rule1", "rule2"] : ["rule2"];
      }
    );

    expect(result).toEqual({
      "foo.js": {
        rule1: 3,
        rule2: 0
      },
      "bar.js": {
        rule2: 0
      }
    });
  });

  it("only tracks rules specified rules", () => {
    const result = createFileSet(
      [
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
          messages: []
        }
      ],
      ["rule1"],
      filename => {
        return filename === "foo.js" ? ["rule1", "rule2"] : ["rule2"];
      }
    );

    expect(result).toEqual({
      "foo.js": {
        rule1: 3
      },
      "bar.js": {}
    });
  });
});

describe("cleanUpDeletedFilesInFileSet", () => {
  it("strips out files that do not exist", () => {
    fs.existsSync.mockReturnValueOnce(true);
    fs.existsSync.mockReturnValueOnce(false);
    fs.existsSync.mockReturnValueOnce(true);

    const result = cleanUpDeletedFilesInFileSet({
      file1: {},
      file2: {},
      file3: {}
    });

    expect(result).toEqual({
      file1: {},
      file3: {}
    });
  });
});

describe("cleanUpWarninglessFilesInFileSet", () => {
  it("strips out files that do not have warnings", () => {
    const result = cleanUpWarninglessFilesInFileSet({
      file1: {
        rule1: 0,
        rule2: 0
      },
      file2: {},
      file3: {
        rule1: 1,
        rule2: 1
      }
    });

    expect(result).toEqual({
      file3: {
        rule1: 1,
        rule2: 1
      }
    });
  });

  it("strips out warnings that have no violations", () => {
    const result = cleanUpWarninglessFilesInFileSet({
      file1: {
        rule1: 0,
        rule2: 1
      },
      file2: {},
      file3: {
        rule1: 0,
        rule2: 1,
        rule3: 3
      }
    });

    expect(result).toEqual({
      file1: {
        rule2: 1
      },
      file3: {
        rule2: 1,
        rule3: 3
      }
    });
  });
});

describe("sortFileSet", () => {
  it("sorts the keys", () => {
    fs.existsSync.mockReturnValue(true);

    const result = sortFileSet({
      "z/a/c": {},
      "b/b/c": {},
      "a/b/c": {}
    });

    expect(Object.keys(result)).toEqual(["a/b/c", "b/b/c", "z/a/c"]);
  });
});
