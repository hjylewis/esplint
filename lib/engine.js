const CLIEngine = require("eslint").CLIEngine;
const { createFileSet } = require("./fileSet");

const cli = new CLIEngine({});
const report = cli.executeOnFiles(["lib/"]);
console.log();
console.log(createFileSet(report.results));
