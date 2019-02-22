# esplint

[![npm](https://img.shields.io/npm/v/esplint.svg?style=flat-square)](https://www.npmjs.com/package/esplint)
[![Build Status](https://img.shields.io/travis/hjylewis/esplint/master.svg?style=flat-square)](https://travis-ci.org/hjylewis/esplint)
[![npm](https://img.shields.io/npm/l/esplint.svg?style=flat-square)](https://github.com/hjylewis/esplint/blob/master/LICENSE)

A ESLint warning tracker to help introduce rules into a legacy code base

## About

Linting is a powerful way to catch bad code and enforce best practices. That said, turning a rule on for an existing project can be difficult. It can surface hidden violations that you must fix before you can use the rule at all.

Instead, esplint allows you to turn new rules on as “warnings,” and prevent further violations. esplint tracks the number of eslint “warnings” in each file and prevents the number of “warnings” from increasing. When the number of “warnings” decreases, esplint records the new lower number. This way you can fix existing, legacy violations over time while avoiding further violations.

## Getting Started

Install esplint as a dev dependency of your project.

```sh
$ npm install esplint --save-dev
```

Create `.esplintrc.js` and add your [configurations](#configuration).

```js
module.exports = {
  surfaceArea: [ ... ],
  rules: [ ...the rules you wish to track... ]
};
```

Run

```sh
$ ./node_modules/.bin/esplint
```

This will create a `.esplint.rec.json` record file that stores the number of eslint warnings per file. Add this file to your git repository.

Now add this esplint check to your validation on commit hooks (using [lint-staged](https://github.com/okonet/lint-staged)) or CI.

Here's an example using lint-staged:

```js
// package.json

{
  ...
  "scripts": {
    "precommit": "lint-staged"
  },
  "lint-staged": {
    "*.js": [
      "esplint",
      "git add .esplint.rec.json"
    ]
  },
  ...
}
```

See a full example [here](example).

## Command line options

```sh
$ ./node_modules/.bin/esplint --help

esplint [options] [file.js] [dir]

Options:
  --version    Show version number                                     [boolean]
  --overwrite  ignore existing record file            [boolean] [default: false]
  --help       Show help                                               [boolean]
```

The options are:

- `--overwrite` — Ignore existing record file. Useful to bypass the esplint check and force an increase in the number of warnings.

## Configuration

```js
// .esplintrc.js

module.exports = {
  surfaceArea: [ ... ],
  eslint: { ... },
  rules: [ ... ]
};
```

The options are:

- `surfaceArea` — An array of files and/or directories to track. Use `[ "." ]` to track all Javascript files in the current directory. These files and directories are used if no files or directories are specified from the CLI
- `eslint` — ESLint cli (CLIEngine) [options](https://eslint.org/docs/developer-guide/nodejs-api#cliengine).
- `rules` — An array of eslint rule names to track.
