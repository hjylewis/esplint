const { compareRuleSets, createRuleSet } = require("../lib/ruleSet");

describe("compareRuleSets", () => {
  it("returns warnings if rule has 0 warnings in ruleSet", () => {
    const result = compareRuleSets({
      rule: 0
    });

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("info");
  });

  it("returns no warnings otherwise", () => {
    expect(compareRuleSets({ rule: 15 })).toHaveLength(0);
  });
});

describe("createRuleSet", () => {
  it("combines the rule sets", () => {
    const result = createRuleSet(
      {
        file1: {
          rule1: 5,
          rule3: 10
        },
        file2: {
          rule1: 2,
          rule2: 1
        }
      },
      ["rule1", "rule2", "rule3"]
    );
    expect(result).toEqual({
      rule1: 7,
      rule2: 1,
      rule3: 10
    });
  });

  it("includes all rules regardless of their presence in the fileSet", () => {
    const result = createRuleSet({}, ["rule1", "rule2", "rule3"]);
    expect(result).toEqual({
      rule1: 0,
      rule2: 0,
      rule3: 0
    });
  });
});
