const { run, getRuleStats } = require("./engine");
const yargs = require("yargs");
const log = require("./log");
const chalk = require("chalk");

function cli(processArgv = process.argv.slice(2)) {
  yargs(processArgv)
    .command(
      "$0",
      "Run check and update record",
      y =>
        y
          .usage("$0 [options] file.js [file.js] [dir]")
          .option("overwrite", {
            default: false,
            describe: "Ignore existing record file",
            type: "boolean"
          })
          .option("no-write", {
            default: false,
            describe: "Don't update record file",
            type: "boolean"
          }),
      argv => {
        check(argv);
      }
    )
    .command(
      "stats",
      "Print stats about eslint violations",
      () => {},
      () => {
        stats();
      }
    )
    .help()
    .parserConfiguration({
      "boolean-negation": false
    }).argv;
}

function check(argv) {
  try {
    const { results, hasError } = run(getOptions(argv), getFiles(argv));
    outputResults(results);
    if (hasError) {
      log.log(
        `\nUse the ${chalk.bold(
          "--overwrite"
        )} flag to ignore these errors and force the record to be rewritten.`
      );
      process.exit(1);
    } else if (results.length === 0) {
      log.log(log.createSuccess("Looking good!"));
    }
  } catch (error) {
    log.error(error);
    process.exit(1);
  }
}

function stats() {
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

    const output = Object.keys(ruleStats.rules)
      .sort()
      .map(rule => {
        const ruleOutput = [];
        const { count, files } = ruleStats.rules[rule];

        if (count === 0) {
          ruleOutput.push(
            chalk.underline.green(`${chalk.bold('"' + rule + '"')}: ${count}`)
          );
        } else {
          ruleOutput.push(
            chalk.underline(`${chalk.bold('"' + rule + '"')}: ${count}`)
          );
        }

        if (files.length === 0) {
          ruleOutput.push(`\t${chalk.italic.dim("No files")}`);
        } else {
          files.sort().forEach(file => {
            ruleOutput.push(`\t- ${file}`);
          });
        }

        return ruleOutput;
      })
      .reduce((a, b) => a.concat("").concat(b), [])
      .concat("")
      .concat("")
      .concat(
        ruleStats.total === 0
          ? chalk.green.bold("No violations!")
          : `${chalk.bold("Total:")} ${ruleStats.total}`
      )
      .join("\n");

    log.log(output);
  } catch (error) {
    log.error(error);
    process.exit(1);
  }
}

function getOptions({ overwrite, noWrite }) {
  return { overwrite, write: !noWrite };
}

function getFiles({ _ }) {
  return _;
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
