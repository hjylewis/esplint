const cosmiconfig = require("cosmiconfig");
const log = require("./log");

const explorer = cosmiconfig("esplint");

function getConfig(options = {}) {
  const result = explorer.searchSync();
  const defaultConfig = {
    surfaceArea: ["."],
    eslint: {},
    rules: [],

    // From CLI
    write: true,
    overwrite: false
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

  return Object.assign({}, defaultConfig, config, options);
}

module.exports = { getConfig };
