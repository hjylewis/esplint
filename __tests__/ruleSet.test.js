const { compareRuleSets, createRuleSet } = require("../lib/ruleSet");

describe("compareRuleSets", () => {
  it("returns warnings if rule has 0 warnings in new ruleSet", () => {
    const result = compareRuleSets(
      {
        rule: 10
      },
      {}
    );

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("warning");
  });

  it("returns no warnings otherwise", () => {
    expect(compareRuleSets({ rule: 10 }, { rule: 15 })).toHaveLength(0);
    expect(compareRuleSets({}, { rule: 15 })).toHaveLength(0);
  });
});

describe("createRuleSet", () => {
  it("combines the rule sets", () => {
    const result = createRuleSet({
      file1: {
        rule1: 5,
        rule3: 10
      },
      file2: {
        rule1: 2,
        rule2: 1
      }
    });
    expect(result).toEqual({
      rule1: 7,
      rule2: 1,
      rule3: 10
    });
  });
});
