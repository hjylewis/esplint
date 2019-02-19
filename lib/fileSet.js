const path = require("path");
const fs = require("fs");
const chalk = require("chalk");

function createFileSet(results, trackedRules, getWarnings) {
  const fileSet = {};
  const trackedRuleSet = new Set(trackedRules);

  results.forEach(({ messages, filePath }) => {
    const relativePath = path.relative(process.cwd(), filePath);
    const rules = {};

    if (getWarnings) {
      getWarnings(relativePath).forEach(name => {
        rules[name] = 0;
      });
    }

    messages.forEach(({ ruleId }) => {
      rules[ruleId] = (rules[ruleId] || 0) + 1;
    });

    Object.keys(rules).forEach(name => {
      if (!trackedRuleSet.has(name)) {
        delete rules[name];
      }
    });

    fileSet[relativePath] = rules;
  });

  return fileSet;
}

function compareFileSets(oldFiles, newFiles) {
  if (!oldFiles) return [];

  return Object.keys(newFiles)
    .map(fileName => {
      return getRuleDifferences(oldFiles[fileName], newFiles[fileName])
        .filter(({ diff }) => diff > 0)
        .map(({ rule, diff }) => {
          return {
            type: "error",
            message: `Warnings of ${chalk.bold(
              '"' + rule + '"'
            )} have increase by +${diff} in "${fileName}"`
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

function cleanUpFileSet(fileSet) {
  return Object.keys(fileSet)
    .sort()
    .filter(filename => {
      return fs.existsSync(filename);
    })
    .map(filename => ({ [filename]: fileSet[filename] }))
    .reduce((r, o) => Object.assign(r, o), {});
}

function combineFileSets(oldFileSet = {}, newFileSet = {}) {
  return Object.assign({}, oldFileSet, newFileSet);
}

module.exports = {
  createFileSet,
  compareFileSets,
  combineFileSets,
  cleanUpFileSet
};
