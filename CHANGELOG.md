# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.9.1](https://github.com/hjylewis/esplint/compare/v0.9.0...v0.9.1) (2020-12-11)


### Bug Fixes

* Allow stage on info ([#96](https://github.com/hjylewis/esplint/issues/96)) ([8488839](https://github.com/hjylewis/esplint/commit/848883942b800585726907993250d080cb77688b))

## [0.9.0](https://github.com/hjylewis/esplint/compare/v0.8.2...v0.9.0) (2020-11-24)


### ⚠ BREAKING CHANGES

* esplint configuration property eslint now only accepts Eslint class options https://eslint.org/docs/developer-guide/nodejs-api#-new-eslintoption if using eslint@7+.

### Features

* Use new Eslint class instead of CLIEngine when available ([#94](https://github.com/hjylewis/esplint/issues/94)) ([d06aa01](https://github.com/hjylewis/esplint/commit/d06aa01a6308ff68db9c49851bb4f2fefe7e85e8))

### [0.8.2](https://github.com/hjylewis/esplint/compare/v0.8.1...v0.8.2) (2020-10-14)

### [0.8.1](https://github.com/hjylewis/esplint/compare/v0.8.0...v0.8.1) (2020-04-30)


### Features

* Unify filepaths to always use posix path separator ([#81](https://github.com/hjylewis/esplint/issues/81)) ([6c8e959](https://github.com/hjylewis/esplint/commit/6c8e959))

## [0.8.0](https://github.com/hjylewis/esplint/compare/v0.7.1...v0.8.0) (2020-03-16)


### ⚠ BREAKING CHANGES

* The esplint record file can no longer have comments. Please remove comments from .esplint.rec.json

### Features

* remove strip-json-comments dependencies ([#63](https://github.com/hjylewis/esplint/issues/63)) ([b336782](https://github.com/hjylewis/esplint/commit/b336782))

### [0.7.1](https://github.com/hjylewis/esplint/compare/v0.7.0...v0.7.1) (2019-09-04)


### Features

* clean up error messages ([#48](https://github.com/hjylewis/esplint/issues/48)) ([6b2bdab](https://github.com/hjylewis/esplint/commit/6b2bdab))
* stage record file flag ([#57](https://github.com/hjylewis/esplint/issues/57)) ([917229e](https://github.com/hjylewis/esplint/commit/917229e))

## [0.7.0](https://github.com/hjylewis/esplint/compare/v0.6.2...v0.7.0) (2019-08-18)


### Bug Fixes

* Ignore untracked rules in record file + fix shadow var decla… ([#39](https://github.com/hjylewis/esplint/issues/39)) ([8752416](https://github.com/hjylewis/esplint/commit/8752416)), closes [#30](https://github.com/hjylewis/esplint/issues/30)
* **suppress:** Respect eslint config ([#41](https://github.com/hjylewis/esplint/issues/41)) ([7d42a52](https://github.com/hjylewis/esplint/commit/7d42a52)), closes [#31](https://github.com/hjylewis/esplint/issues/31)


### Features

* eslint 6 support ([#42](https://github.com/hjylewis/esplint/issues/42)) ([6e3071c](https://github.com/hjylewis/esplint/commit/6e3071c)), closes [#40](https://github.com/hjylewis/esplint/issues/40)
* Move to separate versioning for records ([#43](https://github.com/hjylewis/esplint/issues/43)) ([79043fc](https://github.com/hjylewis/esplint/commit/79043fc))
* Switch to configHash and error if hashes don't match ([#44](https://github.com/hjylewis/esplint/issues/44)) ([c59f7f2](https://github.com/hjylewis/esplint/commit/c59f7f2))

### [0.6.3](https://github.com/hjylewis/esplint/compare/v0.6.2...v0.6.3) (2019-08-20)


### Bug Fixes

* Add error when new recordVersion is present ([#45](https://github.com/hjylewis/esplint/issues/45)) ([f0166e1](https://github.com/hjylewis/esplint/commit/f0166e1))

### [0.6.2](https://github.com/hjylewis/esplint/compare/v0.6.1...v0.6.2) (2019-07-15)



### [0.6.1](https://github.com/hjylewis/esplint/compare/v0.6.0...v0.6.1) (2019-06-21)

### Bug Fixes

- Bump semver from 5.6.0 to 6.1.1 ([#16](https://github.com/hjylewis/esplint/issues/16)) ([aaf7101](https://github.com/hjylewis/esplint/commit/aaf7101))
- Ignore configured configFile ([#21](https://github.com/hjylewis/esplint/issues/21)) ([451264c](https://github.com/hjylewis/esplint/commit/451264c)), closes [#20](https://github.com/hjylewis/esplint/issues/20)

### Tests

- Add travis test for eslint 6 ([#14](https://github.com/hjylewis/esplint/issues/14)) ([594e037](https://github.com/hjylewis/esplint/commit/594e037))

## [0.6.0](https://github.com/hjylewis/esplint/compare/v0.5.1...v0.6.0) (2019-06-18)

### Features

- Add `esplint suppress` ([#11](https://github.com/hjylewis/esplint/issues/11)) ([a193155](https://github.com/hjylewis/esplint/commit/a193155))
