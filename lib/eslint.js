const eslintPkg = require("eslint");
const chalk = require("chalk");
const EsplintError = require("./EsplintError");
const { merge } = require("lodash");

// `loadESLint` (ESLint >=8.57 and 9+) returns the class for the right config
// format. When `useFlatConfig` is undefined it picks the format the same way
// the installed ESLint CLI does. Older ESLint versions only expose the
// eslintrc-only `ESLint` class.
async function resolveESLintClass(useFlatConfig, cwd) {
  if (typeof eslintPkg.loadESLint === "function") {
    return eslintPkg.loadESLint({ useFlatConfig, cwd });
  }
  return eslintPkg.ESLint;
}

async function creatEslintInstance(eslintConfig = {}) {
  // `useFlatConfig` is an esplint-only hint for picking the ESLint class; it is
  // not a valid ESLint constructor option, so strip it before instantiating.
  const { useFlatConfig, ...eslintOptions } = eslintConfig;
  const ESLintClass = await resolveESLintClass(
    useFlatConfig,
    eslintOptions.cwd
  );
  const eslint = new ESLintClass(eslintOptions);
  return {
    runLint: (files) => runLint(eslint, files),
    getConfigForFile: (file) => getConfigForFile(eslint, file),
    isPathIgnored: (file) => eslint.isPathIgnored(file),
  };
}

function overrideRulesConfig(config, rules) {
  return merge({}, config.eslint, {
    overrideConfig: {
      rules,
    },
  });
}

async function runLint(eslint, files) {
  const results = await eslint.lintFiles(files);
  const errorResults = eslint.constructor.getErrorResults(results);
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

// Flat config returns no config for files it ignores or doesn't match.
function getWarningRules({ rules = {} } = {}) {
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
  resolveESLintClass,
};
