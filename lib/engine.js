const {
  compareFileSets,
  createFileSet,
  combineFileSets,
  cleanUpDeletedFilesInFileSet
} = require("./fileSet");
const {
  createRecord,
  isRecordEmpty,
  getRecord,
  writeRecord,
  compareRecords,
  readRecord
} = require("./record");
const {
  compareRuleSets,
  createRuleSet,
  createRuleStats
} = require("./ruleSet");
const {
  createCLIEngine,
  runLint,
  getConfigForFile,
  getWarningRules
} = require("./eslint");
const log = require("./log");
const { getConfig } = require("./config");

function run(options, files) {
  const config = getConfig(options);
  const oldRecord = getRecord(config);
  const cli = createCLIEngine(config.eslint);

  // Run Lint
  const { results: lintResults } = runLint(
    cli,
    getFiles({ files, config, isStartingOver: isRecordEmpty(oldRecord) })
  );

  // Create FileSet
  const oldFileSet = oldRecord.files;
  const newFileSet = createFileSet(lintResults, config.rules, f =>
    getWarningRules(getConfigForFile(cli, f))
  );
  const combinedFileSet = cleanUpDeletedFilesInFileSet(
    combineFileSets(oldRecord.files, newFileSet)
  );

  const results = getResults({
    oldFileSet,
    newFileSet,
    combinedFileSet,
    rules: config.rules
  });
  const hasError = Boolean(
    results.filter(({ type }) => type === "error").length
  );

  // Write Record
  if (!hasError && config.write) {
    const newRecord = createRecord({
      config,
      files: combinedFileSet
    });

    if (compareRecords(oldRecord, newRecord).shouldWrite) {
      writeRecord(newRecord);
    }
  }

  return { results, hasError };
}

function getRuleStats() {
  const record = readRecord();
  const config = getConfig();

  if (record === null) {
    return null;
  }

  return createRuleStats(record.files, config.rules);
}

function getResults({ oldFileSet, newFileSet, combinedFileSet, rules }) {
  const newRuleSet = createRuleSet(combinedFileSet, rules);
  return [
    ...compareFileSets(oldFileSet, newFileSet),
    ...compareRuleSets(newRuleSet)
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

module.exports = {
  run,
  getRuleStats
};
