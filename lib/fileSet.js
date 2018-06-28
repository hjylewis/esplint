const path = require("path");

function createFileSet(results) {
  return results.reduce((files, { messages, filePath }) => {
    const relativePath = path.relative(process.cwd(), filePath);
    return Object.assign({}, files, {
      [relativePath]: messages.reduce((rules, { ruleId }) => {
        rules[ruleId] = (rules[ruleId] || 0) + 1;
        return rules;
      }, {})
    });
  }, {});
}

function compareFileSets(oldFiles, newFiles) {
  return Object.keys(newFiles)
    .map(fileName => {
      return getRuleDifferences(oldFiles[fileName], newFiles[fileName])
        .filter(({ diff }) => diff > 0)
        .map(({ rule, diff }) => {
          return {
            type: "error",
            message: `Warnings of "${rule}" have increase by +${diff} in ${fileName}`
          };
        });
    })
    .reduce((a, b) => a.concat(b), []);
}

function getRuleDifferences(oldRules = {}, newRules) {
  return Object.keys(newRules).map(rule => {
    return {
      rule,
      diff: newRules[rule] - (oldRules[rule] || 0)
    };
  });
}

function combineFileSets(oldFileSet = {}, newFileSet = {}) {
  return Object.assign({}, oldFileSet, newFileSet);
}

module.exports = {
  createFileSet,
  compareFileSets,
  combineFileSets
};
