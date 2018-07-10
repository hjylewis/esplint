const CLIEngine = require("eslint").CLIEngine;
const {
  compareFileSets,
  createFileSet,
  combineFileSets,
  cleanUpFileSet
} = require("./fileSet");
const { createRecord, getRecord, writeRecord } = require("./record");
const { compareRuleSets, createRuleSet } = require("./ruleSet");
const { getWarningRules } = require("./eslint");
const cosmiconfig = require("cosmiconfig");
const log = require("./log");
const chalk = require("chalk");
const explorer = cosmiconfig("esplint");

function run(options, files) {
  const config = Object.assign({}, getConfig(), options);

  const cli = new CLIEngine(config.eslint);
  const { results: lintResults } = runLint(cli, files);
  const oldRecord = getRecord(config);
  const newFileSet = createFileSet(lintResults, config.rules, f =>
    getWarningRules(cli.getConfigForFile(f))
  );

  const results = getResults(oldRecord.files, newFileSet, config.rules);
  const hasError = Boolean(
    results.filter(({ type }) => type === "error").length
  );
  if (!hasError) {
    const combinedFileSet = cleanUpFileSet(
      combineFileSets(oldRecord.files, newFileSet)
    );
    const newRecord = createRecord({
      config,
      files: combinedFileSet
    });
    writeRecord(newRecord);
  }

  return { results, hasError };
}

function getConfig() {
  const result = explorer.searchSync();
  const defaultConfig = {
    eslint: {},
    rules: []
  };
  if (result === null) {
    throw log.createError("No config file found.");
  }

  const { config = {} } = result;

  if (!config.rules || config.rules.length === 0) {
    log.warn(
      log.createWarning(
        "No rules are being tracked. Add some rules to your esplint config."
      )
    );
  }

  return Object.assign({}, defaultConfig, config);
}

function runLint(eslintCli, files) {
  const report = eslintCli.executeOnFiles(files);
  const errorReport = CLIEngine.getErrorResults(report.results);
  const hasErrors = Boolean(errorReport.length);
  if (hasErrors) {
    const formatter = eslintCli.getFormatter();
    throw `${chalk.red(
      "Make sure there aren't any errors before running esplint."
    )}\n${formatter(errorReport)}`;
  }
  return report;
}

function getResults(oldFileSet, newFileSet, rules) {
  const newRuleSet = createRuleSet(newFileSet);
  return [
    ...compareFileSets(oldFileSet, newFileSet),
    ...compareRuleSets(createRuleSet(oldFileSet), newRuleSet),
    ...checkTrackedRules(rules, newRuleSet)
  ];
}

function checkTrackedRules(rules, ruleSet) {
  return rules
    .filter(rule => {
      return ruleSet[rule] === undefined;
    })
    .map(rule => {
      return {
        type: "warning",
        message: `"${rule}" is specified in your esplint config but is not a warning in your eslint config.`
      };
    });
}

module.exports = {
  run
};
