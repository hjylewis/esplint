const path = require("path");

function toPosixPath(filePath) {
  return filePath.split(path.win32.sep).join(path.posix.sep);
}

function toWinPath(filePath) {
  return filePath.split(path.posix.sep).join(path.win32.sep);
}

function toSystemPath(filePath) {
  if (path.sep === path.posix.sep) {
    return toPosixPath(filePath);
  } else {
    return toWinPath(filePath);
  }
}

module.exports = {
  toPosixPath,
  toWinPath,
  toSystemPath
};
