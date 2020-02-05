const path = require("path");
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
    config
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
    writeRecord(newRecord, config);
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
  const rules = ruleIds.reduce((rulesConfig, ruleId) => {
    rulesConfig[ruleId] = "warn";
    return rulesConfig;
  }, {});

  const cli = createCLIEngine(
    Object.assign({}, config.eslint, {
      rules
    })
  );

  // Run Lint
  const { results: lintResults } = runLint(cli, getFiles({ files, config }));

  lintResults
    .map(({ filePath, messages, source, output }) => {
      const onlyMessagesOfTrackedRules = messages.filter(({ ruleId }) => {
        return ruleIds.includes(ruleId);
      });

      if (onlyMessagesOfTrackedRules.length === 0) {
        return null;
      }
      const sourceCode = output ? output : source;

      const violationLineMap = {};
      onlyMessagesOfTrackedRules.forEach(({ line, ruleId }) => {
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

          let violatingRuleIds = [];
          if (hasExistingEslintDisableNextLine) {
            const eslintDisableLine = lines.pop();
            violatingRuleIds = violatingRuleIds.concat(
              eslintDisableLine
                .substring(
                  eslintDisableLine.indexOf(eslintDisableNextLine) +
                    eslintDisableNextLine.length
                )
                .split(",")
                .map(r => r.trim())
            );
          }

          violatingRuleIds = violatingRuleIds.concat(Object.keys(violations));

          if (hasExistingSuppressComment) {
            lines.pop();
          }

          lines.push(`${leadingWhiteSpace}// ${suppressComment}`);
          lines.push(
            `${leadingWhiteSpace}// eslint-disable-next-line ${violatingRuleIds.join(
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

function getResults({ oldFileSet, newFileSet, combinedFileSet, config = {} }) {
  const newRuleSet = createRuleSet(combinedFileSet, config.rules);
  return [
    ...compareFileSets(oldFileSet, newFileSet, config),
    ...compareRuleSets(newRuleSet)
  ];
}

function getFiles({ files, config, isStartingOver = false }) {
  const { surfaceArea = [], workingDir } = config;
  const finalSurfaceArea = surfaceArea.map(file => {
    if (workingDir) {
      return path.resolve(workingDir, file);
    }
    return file;
  });
  if (isStartingOver) {
    log.log(`Starting with an empty record, linting full surface area...`);
    return files.concat(finalSurfaceArea);
  }

  if (!files.length) {
    log.log(`No files provided, running on full surface area...`);
    return finalSurfaceArea;
  }
  return files;
}

module.exports = {
  run,
  getRuleStats,
  suppress
};
