const path = require("path");

function isPosix() {
  return path.sep === path.posix.sep;
}

module.exports = {
  isPosix,
};
