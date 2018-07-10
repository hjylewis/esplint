const chalk = require("chalk");
const figures = require("figures");

const { log, warn, error } = console;

function createWarning(message) {
  return chalk.yellow(`${figures.warning} ${message}`);
}

function createError(message) {
  return chalk.red(`${figures.cross} ${message}`);
}

function createSuccess(message) {
  return chalk.green(`${figures.tick} ${message}`);
}

module.exports = {
  log,
  warn,
  error,
  createWarning,
  createError,
  createSuccess
};
