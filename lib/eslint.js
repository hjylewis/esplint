const CLIEngine = require("eslint").CLIEngine;
const ESLint = require("eslint").ESLint;
const chalk = require("chalk");
const EsplintError = require("./EsplintError");
const { merge } = require("lodash");

function creatEslintInstance(eslintConfig) {
  if (ESLint) {
    const eslint = new ESLint(eslintConfig);
    return {
      runLint: (files) => newRunLint(eslint, files),
      getConfigForFile: (file) => newGetConfigForFile(eslint, file),
    };
  }

  const cli = new CLIEngine(eslintConfig);
  return {
    runLint: (files) => runLint(cli, files),
    getConfigForFile: (file) => getConfigForFile(cli, file),
  };
}

function overrideRulesConfig(config, rules) {
  if (ESLint) {
    return merge({}, config.eslint, {
      overrideConfig: {
        rules,
      },
    });
  } else {
    return merge({}, config.eslint, {
      rules,
    });
  }
}

async function newRunLint(eslint, files) {
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

async function runLint(eslintCli, files) {
  const report = eslintCli.executeOnFiles(files);
  const errorReport = CLIEngine.getErrorResults(report.results);
  const hasErrors = Boolean(errorReport.length);
  if (hasErrors) {
    const formatter = eslintCli.getFormatter();
    throw new EsplintError(
      `There were some ESLint errors. Fix them and try again.\n${chalk.reset(
        formatter(errorReport)
      )}`
    );
  }
  return report.results;
}

function newGetConfigForFile(eslint, file) {
  return eslint.calculateConfigForFile(file);
}

async function getConfigForFile(cli, file) {
  return cli.getConfigForFile(file);
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
