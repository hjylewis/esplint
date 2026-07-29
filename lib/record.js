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
const {
  getFormat,
  getFormatForPath,
  JSON_EXTENSION,
  YAML_EXTENSION,
} = require("./recordFormat");

const RECORD_BASENAME = ".esplint.rec";

function getRecordDir() {
  return pkgDir.sync() || ".";
}

function getRecordPathFor(extension) {
  return path.resolve(getRecordDir(), `${RECORD_BASENAME}${extension}`);
}

// Reading is format-agnostic: whichever record file exists wins, regardless of
// the configured `recordFormat`. That way a branch that hasn't switched formats
// yet still reads correctly.
function findExistingRecord() {
  const candidates = [JSON_EXTENSION, YAML_EXTENSION].map((extension) => ({
    extension,
    filePath: getRecordPathFor(extension),
  }));

  const existing = candidates.filter(({ filePath }) => fs.existsSync(filePath));

  if (existing.length > 1) {
    throw new EsplintError(
      [
        `Found more than one esplint record file:`,
        ...existing.map(({ filePath }) => `  ${filePath}`),
        `Delete the one you don't want so esplint knows which to use.`,
      ].join("\n")
    );
  }

  return existing[0] || null;
}

// Where the record should be written, per the configured format.
function getRecordPath(config = {}) {
  return getRecordPathFor(getFormat(config.recordFormat).extension);
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
  const existing = findExistingRecord();

  if (existing === null) {
    // Record file does not exist
    return null;
  }

  const { filePath } = existing;
  const format = getFormatForPath(filePath);
  const fileName = path.basename(filePath);
  const contents = fs.readFileSync(filePath, "utf8");

  try {
    try {
      return format.parse(contents);
    } catch (e) {
      if (hasGitConflict(contents)) {
        log.warn(
          log.createWarning(
            `Attempting to auto resolve git conflicts find in ${fileName}.`
          )
        );
        return resolveGitConflict(contents, format);
      }

      throw e;
    }
  } catch (e) {
    throw new EsplintError(
      `${fileName} is not valid ${format.name.toUpperCase()}. Please fix and try again.`
    );
  }
}

// Write via a temp file in the same directory, then rename. `rename` is atomic
// on POSIX, so an interrupted run (Ctrl-C, CI timeout, crash) can't leave a
// half-written record behind -- readers see either the old file or the new one.
function writeRecord(record, config = {}) {
  const format = getFormat(config.recordFormat);
  const recordPath = getRecordPath(config);
  const contents = format.serialize(record);
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

  removeStaleRecord(recordPath);
}

// After switching formats, delete the record in the old format so the two can't
// coexist and drift (and so `findExistingRecord` doesn't start erroring).
function removeStaleRecord(activeRecordPath) {
  [JSON_EXTENSION, YAML_EXTENSION].forEach((extension) => {
    const filePath = getRecordPathFor(extension);
    if (filePath === activeRecordPath) return;
    if (!fs.existsSync(filePath)) return;

    log.log(`Removing ${path.basename(filePath)} (switched record format).`);
    fs.unlinkSync(filePath);
  });
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

// Stages whichever record file is actually on disk, so a format switch doesn't
// leave `git add` pointing at a path that no longer exists.
async function stageRecord(config = {}) {
  const existing = findExistingRecord();
  const recordPath = existing ? existing.filePath : getRecordPath(config);
  const fileName = path.basename(recordPath);

  log.log(`Running \`git add ${fileName}\`...`);
  await git.add([recordPath]);
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
