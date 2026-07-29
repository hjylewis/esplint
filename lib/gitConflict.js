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

function resolveGitConflict(file) {
  let state = "common";
  let ours = "";
  let theirs = "";

  file.split(/[\n\r]+/g).forEach((line) => {
    if (line.match(PARENT_RE)) state = "parent";
    else if (line.match(OURS_RE)) state = "ours";
    else if (line.match(THEIRS_RE)) state = "theirs";
    else if (line.match(END_RE)) state = "common";
    else {
      if (state === "common" || state === "ours") ours += line;
      if (state === "common" || state === "theirs") theirs += line;
    }
  });

  return mergeRecords(JSON.parse(ours), JSON.parse(theirs));
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
