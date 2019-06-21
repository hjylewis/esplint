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
const fs = require("fs");

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

const NEWLINE = /\r\n|[\n\r\u2028\u2029]/;
function suppress(ruleIds, files) {
  const config = getConfig();
  const rules = ruleIds.reduce((rules, ruleId) => {
    rules[ruleId] = "warn";
    return rules;
  }, {});

  const cli = createCLIEngine(
    Object.assign({}, config.eslint, {
      useEslintrc: false,
      configFile: null,
      rules
    })
  );

  // Run Lint
  const { results: lintResults } = runLint(cli, getFiles({ files, config }));

  lintResults
    .map(({ filePath, messages, source, output }) => {
      if (messages.length === 0) {
        return null;
      }
      const sourceCode = output ? output : source;

      const violationLineMap = {};
      messages.forEach(({ line, ruleId }) => {
        if (violationLineMap[line]) {
          violationLineMap[line][ruleId] = true;
        } else {
          violationLineMap[line] = {
            [ruleId]: true
          };
        }
      });

      const lines = [];
      sourceCode.split(NEWLINE).forEach((line, i) => {
        const violations = violationLineMap[i + 1];

        if (violations) {
          const leadingWhiteSpace = line.match(/^(\s*)\S/)[1];
          const prevLine = lines[lines.length - 1];
          const suppressComment =
            "FIXME: The next line was auto suppressed by esplint";
          const eslintDisableNextLine = "eslint-disable-next-line";
          const hasExistingSuppressComment =
            lines[lines.length - 2] &&
            lines[lines.length - 2].includes(suppressComment);
          const hasExistingEslintDisableNextLine =
            prevLine && prevLine.includes(eslintDisableNextLine);

          let ruleIds = [];
          if (hasExistingEslintDisableNextLine) {
            const eslintDisableLine = lines.pop();
            ruleIds = ruleIds.concat(
              eslintDisableLine
                .substring(
                  eslintDisableLine.indexOf(eslintDisableNextLine) +
                    eslintDisableNextLine.length
                )
                .split(",")
                .map(r => r.trim())
            );
          }

          ruleIds = ruleIds.concat(Object.keys(violations));

          if (hasExistingSuppressComment) {
            lines.pop();
          }

          lines.push(`${leadingWhiteSpace}// ${suppressComment}`);
          lines.push(
            `${leadingWhiteSpace}// eslint-disable-next-line ${ruleIds.join(
              ", "
            )}`
          );
        }

        lines.push(line);
      });

      return {
        filePath,
        code: lines.join("\n")
      };
    })
    .filter(Boolean)
    .forEach(({ filePath, code }) => {
      fs.writeFileSync(filePath, code, "utf8");
    });
}

function getResults({ oldFileSet, newFileSet, combinedFileSet, rules }) {
  const newRuleSet = createRuleSet(combinedFileSet, rules);
  return [
    ...compareFileSets(oldFileSet, newFileSet),
    ...compareRuleSets(newRuleSet)
  ];
}

function getFiles({ files, config, isStartingOver = false }) {
  const { surfaceArea } = config;
  if (isStartingOver) {
    log.log(`Starting with an empty record, linting full surface area...`);
    return files.concat(surfaceArea);
  }

  if (!files.length) {
    log.log(`No files provided, running on full surface area...`);
    return surfaceArea;
  }

  return files;
}

module.exports = {
  run,
  getRuleStats,
  suppress
};
