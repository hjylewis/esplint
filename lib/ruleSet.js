const chalk = require("chalk");

function createRuleStat() {
  return {
    count: 0,
    files: []
  };
}

function createRuleStats(fileSet, rules) {
  const ruleStats = {};
  rules.forEach(rule => {
    ruleStats[rule] = createRuleStat();
  });

  Object.keys(fileSet).forEach(fileName => {
    const rules = fileSet[fileName];

    Object.keys(rules).forEach(ruleName => {
      const ruleCount = rules[ruleName];

      ruleStats[ruleName].count = ruleStats[ruleName].count + ruleCount;
      ruleStats[ruleName].files = ruleStats[ruleName].files.concat(fileName);
    });
  });

  return ruleStats;
}

function createRuleSet(fileSet, rules) {
  const ruleStats = createRuleStats(fileSet, rules);

  return Object.keys(ruleStats)
    .map(rule => ({
      name: rule,
      count: ruleStats[rule].count
    }))
    .reduce((result, { name, count }) => {
      result[name] = count;
      return result;
    }, {});
}

function compareRuleSets(newRules) {
  return Object.keys(newRules)
    .map(rule => {
      if (newRules[rule] === 0) {
        return {
          type: "info",
          message: `No ${chalk.bold(
            '"' + rule + '"'
          )} warnings are being reported. You can turn it on as an error!`
        };
      }
    })
    .filter(Boolean);
}

module.exports = {
  createRuleSet,
  compareRuleSets,
  createRuleStats
};
