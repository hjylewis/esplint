function createRuleSet(fileSet) {
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

function compareRuleSets(oldRules, newRules) {
  const rules = new Set(Object.keys(oldRules).concat(Object.keys(newRules)));
  return Array.from(rules)
    .map(rule => {
      if ((newRules[rule] || 0) === 0) {
        // warn
        return {
          type: "warning",
          message: `No "${rule}" warnings are being reported. You can turn it on as an error!`
        };
      }

      if ((oldRules[rule] || 0) - (newRules[rule] || 0) > 10) {
        // warn if not --write
      }
    })
    .filter(Boolean);
}

module.exports = {
  createRuleSet,
  compareRuleSets
};
