# esplint

[![npm](https://img.shields.io/npm/v/esplint.svg?style=flat-square)](https://www.npmjs.com/package/esplint)
[![Build Status](https://img.shields.io/github/workflow/status/hjylewis/esplint/Validation%20CI?label=CI&style=flat-square)](https://github.com/hjylewis/esplint/actions/workflows/validate.yml)
[![codecov](https://img.shields.io/codecov/c/github/hjylewis/esplint/master?style=flat-square)](https://codecov.io/gh/hjylewis/esplint)
[![npm](https://img.shields.io/npm/l/esplint.svg?style=flat-square)](https://github.com/hjylewis/esplint/blob/master/LICENSE)

An ESLint warning tracker to help introduce rules into a legacy code base

## About

Linting is a powerful way to catch bad code and enforce best practices. That said, turning a rule on for an existing project can be difficult. It can surface hidden violations that you must fix before you can use the rule at all.

Instead, esplint allows you to turn new rules on as “warnings,” and prevent further violations. esplint tracks the number of eslint “warnings” in each file and prevents the number of “warnings” from increasing. When the number of “warnings” decreases, esplint records the new lower number. This way you can fix existing, legacy violations over time while avoiding further violations.

For more information about the motivation behind esplint, read this [post](http://hjylewis.com/posts/how-to-painlessly-turn-on-eslint-rules/).

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

> NOTE: This record file will only include files _with_ warnings. If a file is included in the esplint "surfaceArea" but not present in the record file then it has none of the tracked warnings.

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
      "esplint --stage-record-file"
    ]
  },
  ...
}
```

See a full example [here](example).

## Command line

```
$ ./node_modules/.bin/esplint --help

esplint [files..]

Run check and update record

Commands:
  esplint [files..]                  Run check and update record      [default]
  esplint stats                      Print stats about eslint violations
  esplint suppress <rule> [files..]  Disable eslint on specific lines to
                                      suppress a rule

Positionals:
  files  Paths to files or directories to run esplint on           [default: []]

Options:
  --version    Show version number                                     [boolean]
  --help       Show help                                               [boolean]
  --overwrite  Ignore existing record file            [boolean] [default: false]
  --no-write   Don't update record file               [boolean] [default: false]
  --stage-record-file  Git add record file. Helpful when running esplint on a
                       pre-commit hook.               [boolean] [default: false]
```

### `esplint`

Run check and update record.

The options are:

- `--since <ref>` — Only lint files changed since a git ref (e.g. `origin/master`), instead of the full surface area. Includes committed, staged, unstaged and untracked changes. Much faster on large projects.
- `--changed` — Only lint files changed in the working tree.
- `--accept` — Record the current counts as the new baseline, including increases. Unlike `--overwrite`, this only touches the files linted in this run, so it doesn't need to re-lint your whole project.
- `--overwrite` — Ignore existing record file and re-generate it from scratch. Needed when `surfaceArea` or `eslint` options change.
- `--no-write` — Only perform warning count check and don't update the record file if the warning count goes down.
- `--stage-record-file` — After esplint succeeds, this will git add the record file. This is helpful when running esplint on a pre-commit hook.

To check just what a pull request touched, and accept any intentional increases:

```sh
$ esplint --since origin/master
$ esplint --since origin/master --accept
```

### `esplint stats`

Print stats about eslint violations.

### `esplint suppress`

Will suppress all existing violations of a eslint rule. It does this by inserting `disable-eslint-next-line` comments into your code.

> NOTE: `esplint suppress` doesn't work very well with JSX because comments in JSX are very [finicky](https://github.com/eslint/eslint/issues/7030). If you have an idea, let me know and open an issue.

## Configuration

```js
// .esplintrc.js

module.exports = {
  surfaceArea: [ ... ],
  eslint: { ... },
  rules: [ ... ],
  write: true,
  recordFormat: "json",
};
```

The options are:

- `surfaceArea` — An array of files and/or directories to track. Use `[ "." ]` to track all Javascript files in the current directory. These files and directories are used if no files or directories are specified from the CLI
- `eslint` — ESLint class [options](https://eslint.org/docs/developer-guide/nodejs-api#-new-eslintoptions).
- `rules` — An array of eslint rule names to track.
- `write` — Corresponds to the negation of the `--no-write` CLI option. See [Command line options](#command-line-options).
- `recordFormat` — `"json"` (default) or `"yaml"`. See [Record format](#record-format).

## Record format

By default the record is written as `.esplint.rec.json`. Setting `recordFormat: "yaml"`
writes `.esplint.rec.yml` instead, which produces smaller, easier-to-review diffs: one
rule per line with no trailing commas, so changing a single count changes exactly one
line and adding a rule doesn't touch the line above it.

esplint reads whichever record file it finds, so switching formats is safe — the old
file is removed automatically on the next write, and the change doesn't invalidate your
existing counts.

## Changing your config

Adding or removing a tracked rule doesn't invalidate the rest of your record. A newly
tracked rule has no baseline yet, so its existing violations are recorded rather than
reported as a regression, and a rule you stop tracking is pruned from the record.

Changing `surfaceArea` or the `eslint` options can change counts in any file, so those
still require `--overwrite`.

## Git Conflicts

Git conflicts can sometimes occur in the record file. If that happens, running `esplint` should fix most cases.
