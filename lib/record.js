const { version } = require("../package.json");
const objHash = require("object-hash");
const fs = require("fs");
const stripJsonComments = require("strip-json-comments");
const pkgDir = require("pkg-dir");
const path = require("path");
const log = require("./log");
const { sortFileSet, cleanUpWarninglessFilesInFileSet } = require("./fileSet");
const semver = require("semver");
const { omit } = require("lodash");
const { hasGitConflict, resolveGitConflict } = require("./gitConflict");

function getRecordPath() {
  const packageDir = pkgDir.sync();
  return packageDir
    ? path.resolve(packageDir, "./.esplint.rec.json")
    : "./.esplint.rec.json";
}

function hash(o) {
  return objHash(o, {
    unorderedArrays: true
  });
}

function createRecord({ files, config }) {
  const rulesHash = hash(config.rules);
  return {
    version,
    hash: rulesHash,
    files: sortFileSet(cleanUpWarninglessFilesInFileSet(files))
  };
}

function getRecord({ overwrite, rules }) {
  if (overwrite) {
    log.log("Overwriting existing the record file...");
    return {};
  }

  const rulesHash = hash(rules);
  const record = readRecord();

  if (record === null) {
    return {};
  }

  if (record.recordVersion) {
    throw new Error(
      log.createError(
        [
          `You are using an older version of esplint than what was used to create .esplint.rec.json.`,
          `Make sure to upgrade esplint so you're on the same version (or higher).`
        ].join("\n")
      )
    );
  }

  if (rulesHash !== record.hash) {
    log.warn(
      log.createWarning(
        "Hashes don't match. Overwriting existing record file..."
      )
    );
    return {};
  }

  return record;
}

function isRecordEmpty(record) {
  return !Object.keys(record).length;
}

function readRecord() {
  let contents;
  try {
    contents = stripJsonComments(fs.readFileSync(getRecordPath(), "utf8"));
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
    throw new Error(
      log.createError(
        ".esplint.rec.json is not valid JSON. Please fix and try again."
      )
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

function areContentsEqual(oldRecord, newRecord) {
  const oldContents = serialize(omit(oldRecord, "version"));
  const newContents = serialize(omit(newRecord, "version"));

  return oldContents === newContents;
}

function compareRecords(oldRecord, newRecord) {
  if (isRecordEmpty(oldRecord)) {
    return {
      shouldWrite: true
    };
  }

  if (semver.gte(newRecord.version, oldRecord.version)) {
    return {
      shouldWrite: true
    };
  }

  if (semver.lt(newRecord.version, oldRecord.version)) {
    if (areContentsEqual(oldRecord, newRecord)) {
      return {
        shouldWrite: false
      };
    }

    // Invalid JSON
    throw new Error(
      log.createError(
        [
          `You are using an older version of esplint (${newRecord.version}) than what was used to create .esplint.rec.json (${oldRecord.version}).`,
          `Make sure to upgrade so you're on the same version.`
        ].join("\n")
      )
    );
  }

  return {
    shouldWrite: true
  };
}

module.exports = {
  isRecordEmpty,
  createRecord,
  getRecord,
  writeRecord,
  compareRecords,
  readRecord
};
