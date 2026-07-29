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

// Fields of the esplint config that can change the warning counts esplint
// records. `rules` is deliberately excluded: it's tracked separately as a list
// (see `getTrackedRules`) so that adding or removing a tracked rule doesn't
// invalidate the baselines of every other rule.
//
// Notably absent: `write`, `overwrite`, `accept`, `stageRecordFile` (CLI/
// behavior only) and `recordFormat` (serialization only).
const COUNT_AFFECTING_FIELDS = ["surfaceArea", "eslint"];

function getGlobalConfigHash(config) {
  const original = config.__originalConfig || {};
  const subset = {};
  COUNT_AFFECTING_FIELDS.forEach((field) => {
    if (original[field] !== undefined) {
      subset[field] = original[field];
    }
  });

  return objHash(subset, { unorderedArrays: true });
}

function getTrackedRules(config) {
  return [...(config.rules || [])].sort();
}

// Which tracked rules changed between the record and the current config.
// A rule that was just added has no baseline, so its counts can only be
// established by a run; a rule that was removed keeps stale entries that
// should be pruned. Neither is a reason to discard the whole record.
function diffTrackedRules(record, config) {
  // Records written before per-rule tracking don't list their rules. Treat the
  // rules observed in the file set as the recorded set: any rule with entries
  // was demonstrably tracked when the record was written.
  const recorded =
    record.trackedRules ||
    Object.keys(
      Object.values(record.files || {}).reduce(
        (acc, ruleCounts) => Object.assign(acc, ruleCounts),
        {}
      )
    );

  const recordedSet = new Set(recorded);
  const currentSet = new Set(getTrackedRules(config));

  return {
    added: [...currentSet].filter((r) => !recordedSet.has(r)).sort(),
    removed: [...recordedSet].filter((r) => !currentSet.has(r)).sort(),
  };
}

// Drop entries for rules that are no longer tracked so they don't linger in
// the record (and in `git diff`) forever.
function pruneRules(files, rulesToRemove) {
  if (!rulesToRemove.length) return files;

  const remove = new Set(rulesToRemove);
  return Object.keys(files).reduce((result, filePath) => {
    const kept = Object.keys(files[filePath])
      .filter((rule) => !remove.has(rule))
      .reduce((acc, rule) => {
        acc[rule] = files[filePath][rule];
        return acc;
      }, {});
    result[filePath] = kept;
    return result;
  }, {});
}

// We'll need this variable eventually
// eslint-disable-next-line no-unused-vars
function getRecordVersion(v) {
  return 1;
}

function createRecord({ files, config }) {
  return {
    recordVersion: getRecordVersion(esplintVersion),
    configHash: getGlobalConfigHash(config),
    trackedRules: getTrackedRules(config),
    files: sortFileSet(cleanUpWarninglessFilesInFileSet(files)),
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
    ),
  };
}

function getRecord(config) {
  const { overwrite } = config;

  if (overwrite) {
    log.log("Overwriting existing the record file...");
    return {};
  }

  const record = unifyFilePaths(readRecord());

  if (record === null) {
    return {};
  }

  checkVersion(record);

  // A change to `surfaceArea` or the `eslint` options can change counts for any
  // file, so there's no safe way to reuse the old baselines.
  //
  // Records written before per-rule tracking hashed the whole config, so their
  // hash is only comparable against that older scheme. Fall back to it, which
  // keeps the pre-existing behavior for those records: any config edit is
  // treated as a global change. They get the narrower check once rewritten.
  const isLegacyHash = record.trackedRules === undefined;
  const expectedHash = isLegacyHash
    ? objHash(config.__originalConfig, { unorderedArrays: true })
    : getGlobalConfigHash(config);

  if (record.configHash !== expectedHash) {
    throw new EsplintError(
      isLegacyHash
        ? [
            `.esplint.rec.json was created using a different configuration.`,
            `Please use the --overwrite flag to re-generate your record file.`,
          ].join("\n")
        : [
            `.esplint.rec.json was created with different "surfaceArea" or "eslint" settings.`,
            `These can change counts in any file, so the record needs to be re-generated.`,
            `Please use the --overwrite flag.`,
          ].join("\n")
    );
  }

  // Adding or removing a tracked rule doesn't invalidate the counts of the
  // rules that didn't change, so keep them.
  const { added, removed } = diffTrackedRules(record, config);

  if (added.length) {
    log.log(
      `Newly tracked ${pluralizeRules(added)}: ${added.join(
        ", "
      )}. Counts will be recorded on this run.`
    );
  }

  if (removed.length) {
    log.log(
      `No longer tracking ${pluralizeRules(removed)}: ${removed.join(
        ", "
      )}. Removing from the record.`
    );
  }

  return Object.assign({}, record, {
    files: pruneRules(record.files || {}, removed),
    // Rules with no baseline yet. Their existing violations aren't a
    // regression, so the check skips them on this run and records them instead.
    newlyTrackedRules: added,
  });
}

function pluralizeRules(rules) {
  return rules.length === 1 ? "rule" : "rules";
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

// Write via a temp file in the same directory, then rename. `rename` is atomic
// on POSIX, so an interrupted run (Ctrl-C, CI timeout, crash) can't leave a
// half-written record behind -- readers see either the old file or the new one.
function writeRecord(record) {
  const recordPath = getRecordPath();
  const contents = serialize(record);
  const tempPath = `${recordPath}.${process.pid}.tmp`;

  try {
    fs.writeFileSync(tempPath, contents, "utf8");
    fs.renameSync(tempPath, recordPath);
  } catch (e) {
    try {
      fs.unlinkSync(tempPath);
    } catch (cleanupError) {
      // Nothing to clean up, or we can't -- report the original failure.
    }
    throw e;
  }
}

function checkVersion(record) {
  const currentRecordVersion = getRecordVersion(esplintVersion);

  if (record.recordVersion !== undefined) {
    if (record.recordVersion > currentRecordVersion) {
      // Reading record with version higher than current
      throw new EsplintError(
        [
          `You are using an older "record version" of esplint (${currentRecordVersion}) than what was used to create .esplint.rec.json (${record.recordVersion}).`,
          `Make sure to upgrade esplint so you're on the same "record version" (or higher).`,
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
      `Please use the --overwrite flag to re-generate your record file.`,
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
  unifyFilePaths,
};
