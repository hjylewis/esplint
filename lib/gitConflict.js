// Inspired by code from npm/cli
// https://github.com/npm/cli/blob/latest/lib/install/read-shrinkwrap.js

const { mergeWith } = require("lodash");

const PARENT_RE = /\|{7,}/g;
const OURS_RE = /<{7,}/g;
const THEIRS_RE = /={7,}/g;
const END_RE = />{7,}/g;

function hasGitConflict(file) {
  return file.match(OURS_RE) && file.match(THEIRS_RE) && file.match(END_RE);
}

const JSON_FORMAT = {
  parse: (contents) => JSON.parse(contents),
};

// Rebuilds the "ours" and "theirs" versions of a conflicted record and merges
// them. Lines are rejoined with newlines rather than concatenated: JSON doesn't
// care, but YAML is newline-significant and would be destroyed otherwise.
function resolveGitConflict(file, format = JSON_FORMAT) {
  let state = "common";
  const ours = [];
  const theirs = [];

  file.split(/\r\n|[\n\r]/g).forEach((line) => {
    if (line.match(PARENT_RE)) state = "parent";
    else if (line.match(OURS_RE)) state = "ours";
    else if (line.match(THEIRS_RE)) state = "theirs";
    else if (line.match(END_RE)) state = "common";
    else {
      if (state === "common" || state === "ours") ours.push(line);
      if (state === "common" || state === "theirs") theirs.push(line);
    }
  });

  return mergeRecords(
    format.parse(ours.join("\n")),
    format.parse(theirs.join("\n"))
  );
}

// Both sides of a conflict are valid baselines, so keep the *higher* count for
// any rule they disagree on. Taking the lower one (what a plain deep merge
// does, since the later value wins) would silently raise the allowance and let
// a regression through until the next full run.
function mergeRecords(ours, theirs) {
  return mergeWith({}, ours, theirs, (ourValue, theirValue) => {
    if (typeof ourValue === "number" && typeof theirValue === "number") {
      return Math.max(ourValue, theirValue);
    }
    // Anything else (objects, new keys) falls through to lodash's default.
    return undefined;
  });
}

module.exports = {
  hasGitConflict,
  resolveGitConflict,
};
