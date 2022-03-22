const path = require("path");
const helpers = require("./helpers");

function toPosixPath(filePath) {
  return filePath.split(path.win32.sep).join(path.posix.sep);
}

function toWinPath(filePath) {
  return filePath.split(path.posix.sep).join(path.win32.sep);
}

function toSystemPath(filePath) {
  if (helpers.isPosix()) {
    return toPosixPath(filePath);
  } else {
    return toWinPath(filePath);
  }
}

module.exports = {
  toPosixPath,
  toWinPath,
  toSystemPath,
};
