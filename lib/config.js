const cosmiconfig = require("cosmiconfig");
const path = require("path");
const log = require("./log");
const EsplintError = require("./EsplintError");

const explorer = cosmiconfig("esplint");

function load({ workingDir } = {}) {
  if (workingDir) {
    return explorer.searchSync(path.resolve(workingDir));
  } else {
    return explorer.searchSync();
  }
}
function getConfig(options = {}) {
  const result = load(options);
  const defaultConfig = {
    surfaceArea: ["."],
    eslint: {},
    rules: [],

    // From CLI
    write: true,
    overwrite: false,
    reduceWarningsBy: 0
  };
  if (result === null) {
    throw new EsplintError("No config file found.");
  }
  const { config = {} } = result;

  if (!config.rules || config.rules.length === 0) {
    log.warn(
      log.createWarning(
        "No rules are being tracked. Add some rules to your esplint config."
      )
    );
  }
  const { reduceWarningsBy } = config;
  if (reduceWarningsBy !== null && reduceWarningsBy !== undefined) {
    if (typeof reduceWarningsBy !== "number") {
      throw new EsplintError("reduceWarningsBy should be a number");
    }
    if (reduceWarningsBy > 1) {
      throw new EsplintError(
        "reduceWarningsBy should never be greater than 1; this implies a percentage greater than 100"
      );
    }
    if (reduceWarningsBy < 0) {
      throw new EsplintError("reduceWarningsBy should never be negative");
    }
  }

  return Object.assign({}, defaultConfig, config, options, {
    __originalConfig: config
  });
}

module.exports = { getConfig };
