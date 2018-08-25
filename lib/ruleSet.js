const chalk = require("chalk");

function createRuleSet(fileSet) {
  if (!fileSet) return fileSet;

  return Object.keys(fileSet)
    .map(fileName => fileSet[fileName])
    .reduce((accumulatdRules, currentRules) => {
      const combinedRules = Object.assign({}, accumulatdRules);
      Object.keys(currentRules).forEach(rule => {
        combinedRules[rule] = (combinedRules[rule] || 0) + currentRules[rule];
      });

      return combinedRules;
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
  compareRuleSets
};
