const { version } = require("../package.json");
const { combineFileSets } = require("./fileSet");

function createRecord({ files } = {}, newFileSet) {
  return {
    version,
    files: combineFileSets(files, newFileSet)
  };
}

module.exports = {
  createRecord
};
