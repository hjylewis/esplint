const path = require("path");
const fs = require("fs");
const chalk = require("chalk");
const R = require("ramda");
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

function guards(config = {}, oldFiles = {}, newFiles = {}) {
  const templateGuard = (formula = () => {}, formatter = () => {}) => {
    const getFileRuleStats = R.reduce((acc, fileName) => {
      const newRules = newFiles[fileName] || {};
      const oldRules = oldFiles[fileName] || {};
      const newRuleNames = R.keys(newRules);
      const stats = R.map(newRuleName => {
        return {
          fileName,
          rule: {
            name: newRuleName,
            newStat: newRules[newRuleName],
            oldStat: oldRules[newRuleName] || 0
          }
        };
      }, newRuleNames);
      return acc.concat(stats);
    }, []);
    const calculateScore = formula => {
      return R.map(file => {
        return {
          ...file,
          score: formula(file.rule.newStat, file.rule.oldStat)
        };
      });
    };
    const fn = R.pipe(
      R.keys,
      getFileRuleStats,
      calculateScore(formula),
      formatter
    );
    return fn(newFiles) || [];
  };
  function warningsIncreaseGuard() {
    const formula = (newStat = 0, oldStat = 0) => {
      return newStat - oldStat;
    };
    const formatter = ({ fileName, rule, score } = {}) => {
      return {
        type: "error",
        message: `Warnings of ${chalk.bold(
          '"' + rule.name + '"'
        )} have increased by +${score} in "${fileName}"`
      };
    };
    const run = () => {
      return templateGuard(
        formula,
        R.pipe(
          R.filter(({ score }) => score > 0),
          R.map(formatter)
        )
      );
    };
    const isValid = () => true;
    return {
      run,
      isValid
    };
  }
  function warningsReducedByGuard() {
    const formula = (newStat, oldStat) => {
      const { reduceWarningsBy } = config;
      if (newStat >= oldStat) {
        return true;
      }
      return newStat > oldStat - Math.ceil(reduceWarningsBy * oldStat);
    };

    const formatter = ({ fileName, rule } = {}) => {
      const { reduceWarningsBy } = config;
      return {
        type: "error",
        message: `Warnings of ${chalk.bold(
          '"' + rule.name + '"'
        )} have not been decreased by ${reduceWarningsBy *
          100}% in "${fileName}"`
      };
    };
    const run = () => {
      return templateGuard(
        formula,
        R.pipe(
          R.filter(({ score } = {}) => !!score),
          R.map(formatter)
        )
      );
    };
    const isValid = () => !!config.reduceWarningsBy;
    return {
      run,
      isValid
    };
  }
  const guardsCollection = {
    warningsIncreased: warningsIncreaseGuard,
    warningsReducedBy: warningsReducedByGuard
  };
  function getValidGuards() {
    const fn = R.pipe(
      R.uniq,
      R.map((guardName = "") => guardsCollection[guardName]()),
      R.filter(guard => guard.isValid())
    );
    return fn(["warningsIncreased", ...(config.guards || [])]);
  }
  return {
    getValidGuards
  };
}

function compareFileSets(oldFiles, newFiles, config = {}) {
  if (!oldFiles) return [];
  const { getValidGuards } = guards(config, oldFiles, newFiles);
  const validGuards = getValidGuards();
  return R.reduce((acc, guard) => acc.concat(guard.run()), [], validGuards);
}

function cleanUpDeletedFilesInFileSet(fileSet) {
  return Object.keys(fileSet)
    .filter(filename => {
      return fs.existsSync(filename);
    })
    .map(filename => ({ [filename]: fileSet[filename] }))
    .reduce((r, o) => Object.assign(r, o), {});
}

function cleanUpWarninglessFilesInFileSet(fileSet) {
  return Object.keys(fileSet)
    .filter(filename => {
      // Exclude warningless files
      const ruleCounts = fileSet[filename];

      const totalCount = Object.keys(ruleCounts)
        .map(rule => ruleCounts[rule])
        .reduce((a, b) => a + b, 0);

      return totalCount > 0;
    })
    .map(filename => {
      const ruleCounts = fileSet[filename];

      const cleanedUpRuleCounts = {};
      Object.keys(ruleCounts)
        .filter(rule => ruleCounts[rule] > 0)
        .forEach(rule => {
          cleanedUpRuleCounts[rule] = ruleCounts[rule];
        });

      return { [filename]: cleanedUpRuleCounts };
    })
    .reduce((r, o) => Object.assign(r, o), {});
}

function sortFileSet(fileSet) {
  const sortedFileSet = {};

  Object.keys(fileSet)
    .sort()
    .forEach(filename => {
      sortedFileSet[filename] = fileSet[filename];
    });

  return sortedFileSet;
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
  sortFileSet
};
