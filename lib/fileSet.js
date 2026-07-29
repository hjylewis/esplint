const path = require("path");
const fs = require("fs");
const chalk = require("chalk");
const { toPosixPath, toSystemPath } = require("./pathUtils");

async function createFileSet(results, trackedRules, getWarnings) {
  const fileSet = {};
  const trackedRuleSet = new Set(trackedRules);

  await Promise.all(
    results.map(async ({ messages, filePath }) => {
      const relativePath = toPosixPath(
        path.relative(process.cwd(), toSystemPath(filePath))
      );
      const rules = {};

      if (getWarnings) {
        const warnings = await getWarnings(relativePath);
        warnings.forEach((name) => {
          rules[name] = 0;
        });
      }

      messages.forEach(({ ruleId }) => {
        rules[ruleId] = (rules[ruleId] || 0) + 1;
      });

      Object.keys(rules).forEach((name) => {
        if (!trackedRuleSet.has(name)) {
          delete rules[name];
        }
      });

      fileSet[relativePath] = rules;
    })
  );

  return fileSet;
}

function compareFileSets(oldFiles, newFiles, skippedRules = []) {
  if (!oldFiles) return [];

  const skipped = new Set(skippedRules);

  return Object.keys(newFiles)
    .map((fileName) => {
      return getRuleDifferences(oldFiles[fileName], newFiles[fileName])
        .filter(({ rule }) => !skipped.has(rule))
        .filter(({ diff }) => diff > 0)
        .map(({ rule, diff }) => {
          return {
            type: "error",
            message: `Warnings of ${chalk.bold(
              '"' + rule + '"'
            )} have increased by +${diff} in "${fileName}"`,
          };
        });
    })
    .reduce((a, b) => a.concat(b), []);
}

function getRuleDifferences(oldRules = {}, newRules) {
  return Object.keys(newRules).map((rule) => {
    return {
      rule,
      diff: newRules[rule] - (oldRules[rule] || 0),
    };
  });
}

function cleanUpDeletedFilesInFileSet(fileSet) {
  return Object.keys(fileSet)
    .filter((filename) => {
      return fs.existsSync(filename);
    })
    .map((filename) => ({ [filename]: fileSet[filename] }))
    .reduce((r, o) => Object.assign(r, o), {});
}

function cleanUpWarninglessFilesInFileSet(fileSet) {
  return Object.keys(fileSet)
    .filter((filename) => {
      // Exclude warningless files
      const ruleCounts = fileSet[filename];

      const totalCount = Object.keys(ruleCounts)
        .map((rule) => ruleCounts[rule])
        .reduce((a, b) => a + b, 0);

      return totalCount > 0;
    })
    .map((filename) => {
      const ruleCounts = fileSet[filename];

      const cleanedUpRuleCounts = {};
      Object.keys(ruleCounts)
        .filter((rule) => ruleCounts[rule] > 0)
        .forEach((rule) => {
          cleanedUpRuleCounts[rule] = ruleCounts[rule];
        });

      return { [filename]: cleanedUpRuleCounts };
    })
    .reduce((r, o) => Object.assign(r, o), {});
}

// Sorts filenames *and* the rule keys within each file. Rule keys used to keep
// insertion order, which varies with lint order, so unrelated runs could
// reshuffle lines and produce noisy diffs and avoidable merge conflicts.
function sortFileSet(fileSet) {
  const sortedFileSet = {};

  Object.keys(fileSet)
    .sort()
    .forEach((filename) => {
      sortedFileSet[filename] = sortRuleCounts(fileSet[filename]);
    });

  return sortedFileSet;
}

function sortRuleCounts(ruleCounts) {
  const sorted = {};

  Object.keys(ruleCounts)
    .sort()
    .forEach((rule) => {
      sorted[rule] = ruleCounts[rule];
    });

  return sorted;
}

function combineFileSets(oldFileSet = {}, newFileSet = {}) {
  return Object.assign({}, oldFileSet, newFileSet);
}

module.exports = {
  createFileSet,
  compareFileSets,
  combineFileSets,
  cleanUpDeletedFilesInFileSet,
  cleanUpWarninglessFilesInFileSet,
  sortFileSet,
};
