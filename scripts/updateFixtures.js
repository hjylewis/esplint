const fs = require("fs");
const path = require("path");

module.exports = function updateFixtures() {
  const fixturesDir = path.resolve("./__tests__/integration/fixtures/");
  const fixtureNames = fs
    .readdirSync(fixturesDir, {
      withFileTypes: true,
    })
    .filter((f) => f.isDirectory())
    .map((f) => f.name);

  fixtureNames.forEach((fixture) => {
    process.chdir(path.resolve(fixturesDir, `./${fixture}`));

    // Make Changes here
  });
};

module.exports();
