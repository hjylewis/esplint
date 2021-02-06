const { run, getRuleStats, suppress: suppressRules } = require("./engine");
const yargs = require("yargs");
const log = require("./log");
const chalk = require("chalk");
const EsplintError = require("./EsplintError");
const { stageRecord } = require("./record");

function cli(processArgv = process.argv.slice(2)) {
  yargs(processArgv)
    .command(
      "$0 [files..]",
      "Run check and update record",
      y =>
        y
          .positional("files", {
            describe: "Paths to files or directories to run esplint on",
            default: []
          })
          .option("overwrite", {
            default: false,
            describe: "Ignore existing record file",
            type: "boolean"
          })
          .option("no-write", {
            default: false,
            describe: "Don't update record file",
            type: "boolean"
          })
          .option("stage-record-file", {
            default: false,
            describe:
              "Git add record file. Helpful when running esplint on a pre-commit hook.",
            type: "boolean"
          }),
      argv => {
        check(argv);
      }
    )
    .command(
      "stats",
      "Print stats about eslint violations",
      y =>
        y.option("compact", {
          default: "false",
          describe: "Only prints the violated rules without listing the files",
          type: "boolean"
        }),
      argv => {
        stats(argv);
      }
    )
    .command(
      "suppress <rule> [files..]",
      "Disable eslint on specific lines to suppress a rule",
      y =>
        y
          .positional("rule", {
            describe: "ESLint rule to suppress",
            type: "string"
          })
          .positional("files", {
            describe: "Paths to files or directories to suppress rules in",
            type: "string"
          }),
      argv => {
        suppress(argv);
      }
    )
    .help()
    .parserConfiguration({
      "boolean-negation": false
    }).argv;
}

async function check(argv) {
  try {
    const options = getOptions(argv);
    const { results, hasError } = await run(options, getFiles(argv));
    outputResults(results);
    if (hasError) {
      log.log(
        `\nUse the ${chalk.bold(
          "--overwrite"
        )} flag to ignore these errors and force the record to be rewritten.`
      );
      process.exit(1);
    } else if (results.filter(({ type }) => type !== "info").length === 0) {
      log.log(log.createSuccess("Looking good!"));

      if (options.stageRecordFile) {
        stageRecord();
      }
    }
  } catch (error) {
    if (error instanceof EsplintError) {
      log.error(log.createError(error.message));
    } else {
      log.error(error);
    }

    process.exit(1);
  }
}

function stats(argv) {
  try {
    const ruleStats = getRuleStats();
    if (ruleStats === null) {
      log.warn(
        log.createWarning(
          'esplint cannot find ".esplint.rec.json". Try running esplint first.'
        )
      );
      return;
    }

    const totalCount = Object.keys(ruleStats)
      .map(rule => ruleStats[rule].count)
      .reduce((a, b) => a + b, 0);

    const { compact } = argv;

    let output = Object.keys(ruleStats)
      .sort()
      .map(rule => {
        const ruleOutput = [];
        const { count, files } = ruleStats[rule];

        if (count === 0) {
          ruleOutput.push(
            chalk.underline.green(`${chalk.bold('"' + rule + '"')}: ${count}`)
          );
        } else {
          ruleOutput.push(
            chalk.underline(`${chalk.bold('"' + rule + '"')}: ${count}`)
          );
        }

        if (compact) {
          return ruleOutput;
        }

        if (files.length === 0) {
          ruleOutput.push(` ${chalk.italic.dim("No files")}`);
        } else {
          files.sort().forEach(file => {
            ruleOutput.push(` - ${file}`);
          });
        }

        return ruleOutput;
      });

    if (!compact) {
      output = output.reduce((a, b) => a.concat("").concat(b), []).concat("");
    }

    output = output
      .concat("")
      .concat(
        totalCount === 0
          ? chalk.green.bold("No violations!")
          : `${chalk.bold("Total:")} ${totalCount}`
      )
      .join("\n");

    log.log(output);
  } catch (error) {
    log.error(error);
    process.exit(1);
  }
}

async function suppress(argv) {
  try {
    const rules = argv.rule.split(",").map(r => r.trim());
    const files = getFiles(argv);

    await suppressRules(rules, files);
    log.log(log.createSuccess("Done!"));
  } catch (error) {
    log.error(error);
    process.exit(1);
  }
}

function getOptions({ overwrite, noWrite, stageRecordFile }) {
  return { overwrite, write: !noWrite, stageRecordFile };
}

function getFiles({ files }) {
  return files;
}

function outputResults(results) {
  results.forEach(({ type, message }) => {
    switch (type) {
      case "error":
        log.error(log.createError(message));
        return;
      case "warning":
        log.warn(log.createWarning(message));
        return;
      default:
        log.log(message);
    }
  });
}

module.exports = cli;
