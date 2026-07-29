const ESLint = require("eslint").ESLint;
const chalk = require("chalk");
const EsplintError = require("./EsplintError");
const { merge } = require("lodash");

function creatEslintInstance(eslintConfig) {
  const eslint = new ESLint(eslintConfig);
  return {
    runLint: (files) => runLint(eslint, files),
    getConfigForFile: (file) => getConfigForFile(eslint, file),
    isPathIgnored: (file) => eslint.isPathIgnored(file),
  };
}

// Takes the user's `eslint` options (i.e. `config.eslint`) and layers the given
// rules on top. Previously this read `config.eslint` from its argument, which
// was already `config.eslint` -- so it looked up `config.eslint.eslint`,
// silently dropping every option the user had set.
function overrideRulesConfig(eslintOptions, rules) {
  return merge({}, eslintOptions, {
    overrideConfig: {
      rules,
    },
  });
}

async function runLint(eslint, files) {
  const results = await eslint.lintFiles(files);
  const errorResults = ESLint.getErrorResults(results);
  const hasErrors = Boolean(errorResults.length);
  if (hasErrors) {
    const formatter = await eslint.loadFormatter();
    throw new EsplintError(
      `There were some ESLint errors. Fix them and try again.\n${chalk.reset(
        formatter.format(errorResults)
      )}`
    );
  }
  return results;
}

function getConfigForFile(eslint, file) {
  return eslint.calculateConfigForFile(file);
}

function getWarningRules({ rules }) {
  return Object.keys(rules).filter((name) => {
    const ruleConfig = rules[name];
    const setting = Array.isArray(ruleConfig) ? ruleConfig[0] : ruleConfig;
    return setting === "warn" || setting === 1;
  });
}

module.exports = {
  creatEslintInstance,
  getWarningRules,
  overrideRulesConfig,
};
