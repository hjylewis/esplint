const path = require("path");
const fs = require("fs");
const eslintPkg = require("eslint");
const chalk = require("chalk");
const EsplintError = require("./EsplintError");
const { merge } = require("lodash");

const FLAT_CONFIG_FILENAMES = [
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
];

// Mirror the ESLint CLI's logic for choosing between flat and legacy
// (eslintrc) config. An explicit override (from the esplint config) wins,
// then the ESLINT_USE_FLAT_CONFIG env var, then the presence of a flat
// config file in the working directory.
function shouldUseFlatConfig(cwd, override) {
  if (typeof override === "boolean") {
    return override;
  }

  if (process.env.ESLINT_USE_FLAT_CONFIG === "true") {
    return true;
  }
  if (process.env.ESLINT_USE_FLAT_CONFIG === "false") {
    return false;
  }

  return FLAT_CONFIG_FILENAMES.some((filename) =>
    fs.existsSync(path.join(cwd, filename))
  );
}

// `loadESLint` exists in ESLint >=8.18 and all of v9, and returns the correct
// class (FlatESLint or LegacyESLint) for the requested config format. Older
// ESLint versions only expose the legacy `ESLint` class (eslintrc only).
async function resolveESLintClass(useFlatConfig) {
  if (typeof eslintPkg.loadESLint === "function") {
    return eslintPkg.loadESLint({ useFlatConfig });
  }
  return eslintPkg.ESLint;
}

async function creatEslintInstance(eslintConfig = {}) {
  // `useFlatConfig` is an esplint-only hint for picking the ESLint class; it is
  // not a valid ESLint constructor option, so strip it before instantiating.
  const { useFlatConfig, ...eslintOptions } = eslintConfig;
  const cwd = eslintOptions.cwd || process.cwd();
  const ESLintClass = await resolveESLintClass(
    shouldUseFlatConfig(cwd, useFlatConfig)
  );
  const eslint = new ESLintClass(eslintOptions);
  return {
    runLint: (files) => runLint(eslint, files),
    getConfigForFile: (file) => getConfigForFile(eslint, file),
  };
}

function overrideRulesConfig(config, rules) {
  return merge({}, config.eslint, {
    overrideConfig: {
      rules,
    },
  });
}

async function runLint(eslint, files) {
  const results = await eslint.lintFiles(files);
  const errorResults = eslint.constructor.getErrorResults(results);
  const hasErrors = Boolean(errorResults.length);
  if (hasErrors) {
    const formatter = await eslint.loadFormatter();
    throw new EsplintError(
      `There were some ESLint errors. Fix them and try again.\n${chalk.reset(
        formatter.format(errorResults)
      )}`
    );
  }
  return results;
}

function getConfigForFile(eslint, file) {
  return eslint.calculateConfigForFile(file);
}

function getWarningRules({ rules }) {
  return Object.keys(rules).filter((name) => {
    const ruleConfig = rules[name];
    const setting = Array.isArray(ruleConfig) ? ruleConfig[0] : ruleConfig;
    return setting === "warn" || setting === 1;
  });
}

module.exports = {
  creatEslintInstance,
  getWarningRules,
  overrideRulesConfig,
};
