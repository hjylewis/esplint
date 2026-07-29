const path = require("path");
const micromatch = require("micromatch");
const git = require("simple-git")();
const EsplintError = require("./EsplintError");
const { toPosixPath } = require("./pathUtils");

// Statuses worth linting: Added, Copied, Modified, Renamed. Deleted files are
// excluded -- they can't be linted, and `cleanUpDeletedFilesInFileSet` already
// drops them from the record.
const DIFF_FILTER = "ACMR";

async function getChangedFiles({ since, changed }) {
  const baseArgs = ["--name-only", `--diff-filter=${DIFF_FILTER}`];

  // Committed work on this branch. A commit range and `--cached` are mutually
  // exclusive in `git diff`, so this is a separate invocation from the
  // working-tree diffs below.
  let committed = [];
  if (since) {
    await assertRevisionExists(since);
    // Compare against the merge base so files changed on the base branch since
    // it diverged aren't attributed to this branch.
    const range = `${await getMergeBase(since)}...HEAD`;
    committed = parseFileList(await git.diff([...baseArgs, range]));
  }

  // Uncommitted work: staged, unstaged and untracked. Always included -- when
  // checking `--since` locally, the working tree is part of what you're about
  // to push.
  const [staged, unstaged, untracked] = await Promise.all([
    git.diff([...baseArgs, "--cached"]).then(parseFileList),
    git.diff(baseArgs).then(parseFileList),
    getUntrackedFiles(),
  ]);

  return unique([...committed, ...staged, ...unstaged, ...untracked]);
}

async function getMergeBase(since) {
  try {
    const base = await git.raw(["merge-base", since, "HEAD"]);
    return base.trim();
  } catch (e) {
    // Shallow clones (common in CI) may not share history with the base ref.
    // Diffing directly is less precise but better than failing the run.
    return since;
  }
}

async function assertRevisionExists(revision) {
  try {
    await git.raw(["rev-parse", "--verify", `${revision}^{commit}`]);
  } catch (e) {
    throw new EsplintError(
      [
        `Cannot resolve "${revision}" as a git revision.`,
        `In CI, make sure the base branch is fetched (a shallow clone may not include it).`,
      ].join("\n")
    );
  }
}

async function getUntrackedFiles() {
  const status = await git.raw(["ls-files", "--others", "--exclude-standard"]);
  return parseFileList(status);
}

function parseFileList(output) {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function unique(list) {
  return [...new Set(list)];
}

// Keep only files inside the configured surface area. Without this, a changed
// file outside it would be linted, produce an empty rule map, and -- because
// `combineFileSets` replaces a file's whole entry -- wipe that file's recorded
// counts.
function filterToSurfaceArea(files, surfaceArea) {
  const patterns = surfaceArea.map(toMatchablePattern);

  return files.filter((file) => {
    const relative = toPosixPath(file);
    return patterns.some((pattern) => micromatch.isMatch(relative, pattern));
  });
}

// `surfaceArea` entries are paths ("." or "./scripts") or globs
// ("./src/**/*{.ts,.tsx}"). Normalize both into a glob that matches
// repo-relative posix paths.
function toMatchablePattern(entry) {
  const normalized = toPosixPath(entry).replace(/^\.\//, "");

  if (isGlob(normalized)) {
    return normalized;
  }

  // A directory (including ".") matches everything beneath it.
  const asDir = normalized === "." || normalized === "" ? "" : `${normalized}/`;
  return `${asDir}**`;
}

function isGlob(pattern) {
  return /[*?[\]{}!+@()]/.test(pattern);
}

// Files inside the surface area can still be ignored by ESLint itself
// (.eslintignore, ignorePatterns). Linting those yields a "File ignored"
// result with no ruleId, which would also create a spurious empty entry.
async function filterEslintIgnored(files, eslint) {
  const keep = await Promise.all(
    files.map(async (file) => {
      try {
        return (await eslint.isPathIgnored(file)) ? null : file;
      } catch (e) {
        // If ESLint can't decide, keep the file and let the lint run report it.
        return file;
      }
    })
  );

  return keep.filter(Boolean);
}

function relativeToCwd(files, cwd = process.cwd()) {
  return files.map((file) =>
    toPosixPath(path.isAbsolute(file) ? path.relative(cwd, file) : file)
  );
}

module.exports = {
  getChangedFiles,
  filterToSurfaceArea,
  filterEslintIgnored,
  relativeToCwd,
};
