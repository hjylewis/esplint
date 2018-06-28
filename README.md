# ESplint :face_with_head_bandage:

## Install

```
npm install esplint --save-dev
```

### Recommended Usage

## CLI options

```
esplint [options] files

Configuration:
  --enforced  Turn on enforced rules
  --tidy      Remove unnecessary rules

Commands:
  --init      Create ESplint rules for all failing eslint rules
  --generate  Generates an .eslintrc file for your editor
```

## Configuration

```
// .esplintrc.js

module.exports = {
  rules: {
    "rule-thing": {
      "max": 40,
    }
  }
}
```
