// Inspired by code from npm/cli
// https://github.com/npm/cli/blob/latest/lib/install/read-shrinkwrap.js

const { merge } = require("lodash");

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

  file.split(/[\n\r]+/g).forEach(line => {
    if (line.match(PARENT_RE)) state = "parent";
    else if (line.match(OURS_RE)) state = "ours";
    else if (line.match(THEIRS_RE)) state = "theirs";
    else if (line.match(END_RE)) state = "common";
    else {
      if (state === "common" || state === "ours") ours += line;
      if (state === "common" || state === "theirs") theirs += line;
    }
  });

  return merge({}, JSON.parse(ours), JSON.parse(theirs));
}

module.exports = {
  hasGitConflict,
  resolveGitConflict
};
