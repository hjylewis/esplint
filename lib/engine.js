const CLIEngine = require("eslint").CLIEngine;
const {
  compareFileSets,
  createFileSet,
  combineFileSets,
  cleanUpFileSet
} = require("./fileSet");
const {
  createRecord,
  isRecordEmpty,
  getRecord,
  writeRecord
} = require("./record");
const { compareRuleSets, createRuleSet } = require("./ruleSet");
const { getWarningRules } = require("./eslint");
const cosmiconfig = require("cosmiconfig");
const log = require("./log");
const chalk = require("chalk");
const explorer = cosmiconfig("esplint");

function run(options, files) {
  const config = Object.assign({}, getConfig(), options);

  const cli = new CLIEngine(config.eslint);
  const oldRecord = getRecord(config);
  const { results: lintResults } = runLint(
    cli,
    getFiles({ files, config, isStartingOver: isRecordEmpty(oldRecord) })
  );
  const newFileSet = createFileSet(lintResults, config.rules, f =>
    getWarningRules(cli.getConfigForFile(f))
  );
  const combinedFileSet = cleanUpFileSet(
    combineFileSets(oldRecord.files, newFileSet)
  );

  const results = getResults({
    oldFileSet: oldRecord.files,
    newFileSet,
    combinedFileSet,
    rules: config.rules
  });
  const hasError = Boolean(
    results.filter(({ type }) => type === "error").length
  );
  if (!hasError) {
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
    surfaceArea: ["."],
    eslint: {},
    rules: []
  };
  if (result === null) {
    throw new Error(log.createError("No config file found."));
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
    throw new Error(
      `${chalk.red(
        "Make sure there aren't any errors before running esplint."
      )}\n${formatter(errorReport)}`
    );
  }
  return report;
}

function getResults({ oldFileSet, newFileSet, combinedFileSet, rules }) {
  const newRuleSet = createRuleSet(combinedFileSet);
  return [
    ...compareFileSets(oldFileSet, newFileSet),
    ...compareRuleSets(newRuleSet),
    ...checkTrackedRules(rules, newRuleSet)
  ];
}

function getFiles({ files, config, isStartingOver }) {
  const { surfaceArea } = config;
  if (isStartingOver) {
    log.log(`Starting with an empty record, linting full surface area...`);
    return files.concat(surfaceArea);
  }

  if (!files.length) {
    log.log(`No files provided, linting full surface area...`);
    return surfaceArea;
  }

  return files;
}

function checkTrackedRules(rules, ruleSet) {
  return rules
    .filter(rule => {
      return ruleSet[rule] === undefined;
    })
    .map(rule => {
      return {
        type: "warning",
        message: `${chalk.bold(
          '"' + rule + '"'
        )} is specified in your esplint config but is not a warning in your eslint config.`
      };
    });
}

module.exports = {
  run
};
