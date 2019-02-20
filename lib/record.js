const { version } = require("../package.json");
const objHash = require("object-hash");
const fs = require("fs");
const stripJsonComments = require("strip-json-comments");
const pkgDir = require("pkg-dir");
const path = require("path");
const log = require("./log");

const packageDir = pkgDir.sync();
const recordPath = packageDir
  ? path.resolve(packageDir, "./.esplint.rec.json")
  : "./.esplint.rec.json";

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
    files
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
    contents = fs.readFileSync(recordPath, "utf8");
  } catch (e) {
    // Record File does not exist
    return null;
  }

  // TODO: add some format checks

  try {
    return JSON.parse(stripJsonComments(contents));
  } catch (e) {
    // Invalid JSON
    throw new Error(
      log.createError(
        ".esplint.rec.json is not valid JSON. Please fix and try again."
      )
    );
  }
}

function writeRecord(record) {
  const contents = JSON.stringify(record, null, 2);
  fs.writeFileSync(recordPath, contents, "utf8");
}

module.exports = {
  isRecordEmpty,
  createRecord,
  getRecord,
  writeRecord
};
