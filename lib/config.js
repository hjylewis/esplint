const { cosmiconfigSync } = require("cosmiconfig");
const log = require("./log");
const EsplintError = require("./EsplintError");
const { isValidFormatName, DEFAULT_FORMAT } = require("./recordFormat");

const explorer = cosmiconfigSync("esplint");

function getConfig(options = {}) {
  const result = explorer.search();
  const defaultConfig = {
    surfaceArea: ["."],
    eslint: {},
    rules: [],
    recordFormat: DEFAULT_FORMAT.name,

    // From CLI
    write: true,
    overwrite: false,
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

  if (
    config.recordFormat !== undefined &&
    !isValidFormatName(config.recordFormat)
  ) {
    throw new EsplintError(
      `Invalid "recordFormat": ${JSON.stringify(
        config.recordFormat
      )}. Use "json" or "yaml".`
    );
  }

  return Object.assign({}, defaultConfig, config, options, {
    __originalConfig: config,
  });
}

module.exports = { getConfig };
