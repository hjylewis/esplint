const CLIEngine = require("eslint").CLIEngine;
const chalk = require("chalk");
const EsplintError = require("./EsplintError");

function createCLIEngine(eslintConfig) {
  return new CLIEngine(eslintConfig);
}

function runLint(eslintCli, files) {
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
  return report;
}

function getConfigForFile(cli, file) {
  return cli.getConfigForFile(file);
}

function getWarningRules({ rules }) {
  return Object.keys(rules).filter(name => {
    const ruleConfig = rules[name];
    const setting = Array.isArray(ruleConfig) ? ruleConfig[0] : ruleConfig;
    return setting === "warn" || setting === 1;
  });
}

module.exports = {
  createCLIEngine,
  runLint,
  getConfigForFile,
  getWarningRules
};
