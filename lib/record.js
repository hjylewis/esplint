const { version: esplintVersion } = require("../package.json");
const objHash = require("object-hash");
const fs = require("fs");
const pkgDir = require("pkg-dir");
const path = require("path");
const log = require("./log");
const { sortFileSet, cleanUpWarninglessFilesInFileSet } = require("./fileSet");
const semver = require("semver");
const { hasGitConflict, resolveGitConflict } = require("./gitConflict");
const EsplintError = require("./EsplintError");
const git = require("simple-git")();
const { toPosixPath } = require("./pathUtils");

function getRecordPath() {
  const packageDir = pkgDir.sync();
  return packageDir
    ? path.resolve(packageDir, "./.esplint.rec.json")
    : "./.esplint.rec.json";
}

function getConfigHash(config) {
  return objHash(config.__originalConfig, {
    unorderedArrays: true
  });
}

// We'll need this variable eventually
// eslint-disable-next-line no-unused-vars
function getRecordVersion(v) {
  return 1;
}

function createRecord({ files, config }) {
  const configHash = getConfigHash(config);
  return {
    recordVersion: getRecordVersion(esplintVersion),
    configHash,
    files: sortFileSet(cleanUpWarninglessFilesInFileSet(files))
  };
}

function unifyFilePaths(record) {
  if (record === null) {
    return record;
  }

  return {
    ...record,
    files: Object.entries(record.files).reduce(
      (result, [filePath, warnings]) => {
        result[toPosixPath(filePath)] = warnings;
        return result;
      },
      {}
    )
  };
}

function getRecord(config) {
  const { overwrite } = config;

  if (overwrite) {
    log.log("Overwriting existing the record file...");
    return {};
  }

  const configHash = getConfigHash(config);
  const record = unifyFilePaths(readRecord());

  if (record === null) {
    return {};
  }

  checkVersion(record);

  if (configHash !== record.configHash) {
    throw new EsplintError(
      [
        `.esplint.rec.json was created using a different configuration.`,
        `Please use the --overwrite flag to re-generate your record file.`
      ].join("\n")
    );
  }

  return record;
}

function isRecordEmpty(record) {
  return !Object.keys(record).length;
}

function readRecord() {
  let contents;
  try {
    contents = fs.readFileSync(getRecordPath(), "utf8");
  } catch (e) {
    // Record File does not exist
    return null;
  }

  // TODO: add some format checks

  try {
    try {
      return JSON.parse(contents);
    } catch (e) {
      // Invalid JSON

      if (hasGitConflict(contents)) {
        log.warn(
          log.createWarning(
            "Attempting to auto resolve git conflicts find in .esplint.rec.json."
          )
        );
        return resolveGitConflict(contents);
      }

      throw e;
    }
  } catch (e) {
    throw new EsplintError(
      ".esplint.rec.json is not valid JSON. Please fix and try again."
    );
  }
}

function serialize(object) {
  return JSON.stringify(object, null, 2);
}

function writeRecord(record) {
  const contents = serialize(record);
  fs.writeFileSync(getRecordPath(), contents, "utf8");
}

function checkVersion(record) {
  const currentRecordVersion = getRecordVersion(esplintVersion);

  if (record.recordVersion !== undefined) {
    if (record.recordVersion > currentRecordVersion) {
      // Reading record with version higher than current
      throw new EsplintError(
        [
          `You are using an older "record version" of esplint (${currentRecordVersion}) than what was used to create .esplint.rec.json (${record.recordVersion}).`,
          `Make sure to upgrade esplint so you're on the same "record version" (or higher).`
        ].join("\n")
      );
    }

    // Otherwise, continue
    return;
  }

  // Legacy
  // Can be removed once currentRecordVersion > 1
  if (
    record.version &&
    semver.gte(record.version, "0.4.1") &&
    currentRecordVersion === 1
  ) {
    // Transition to new record version format
    return;
  }

  // Version is old or can't be determined
  throw new EsplintError(
    [
      `Cannot determine the version of your record file or the version is too out-of-date.`,
      `Please use the --overwrite flag to re-generate your record file.`
    ].join("\n")
  );
}

async function stageRecord() {
  log.log("Running `git add .esplint.rec.json`...");
  await git.add([getRecordPath()]);
  log.log("Record file staged.");
}

module.exports = {
  isRecordEmpty,
  createRecord,
  getRecord,
  writeRecord,
  readRecord,
  stageRecord,
  unifyFilePaths
};
