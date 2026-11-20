const {
  getFormat,
  getFormatForPath,
  isValidFormatName,
  DEFAULT_FORMAT,
} = require("../lib/recordFormat");

const record = {
  recordVersion: 1,
  configHash: "abc123",
  trackedRules: ["@typescript-eslint/require-await", "no-console"],
  files: {
    "src/app/foo.ts": {
      "@typescript-eslint/require-await": 3,
      "no-console": 1,
    },
    "src/bar.ts": { "no-console": 2 },
  },
};

describe("format selection", () => {
  it("defaults to json so existing users are unaffected", () => {
    expect(DEFAULT_FORMAT.name).toEqual("json");
    expect(getFormat(undefined).name).toEqual("json");
    expect(getFormat("nonsense").name).toEqual("json");
  });

  it("resolves by name and by file extension", () => {
    expect(getFormat("yaml").name).toEqual("yaml");
    expect(getFormatForPath("/x/.esplint.rec.yml").name).toEqual("yaml");
    expect(getFormatForPath("/x/.esplint.rec.json").name).toEqual("json");
  });

  it("validates configured names", () => {
    expect(isValidFormatName("json")).toBe(true);
    expect(isValidFormatName("yaml")).toBe(true);
    expect(isValidFormatName("yml")).toBe(false);
  });
});

describe.each([["json"], ["yaml"]])("%s round-trip", (name) => {
  const format = getFormat(name);

  it("round-trips a record", () => {
    expect(format.parse(format.serialize(record))).toEqual(record);
  });

  it("round-trips an empty file set", () => {
    const empty = { ...record, files: {} };
    expect(format.parse(format.serialize(empty))).toEqual(empty);
  });

  it("round-trips a file with no rules", () => {
    const withEmptyFile = { ...record, files: { "a.js": {} } };
    expect(format.parse(format.serialize(withEmptyFile))).toEqual(
      withEmptyFile
    );
  });

  it("ends with a newline", () => {
    expect(format.serialize(record).endsWith("\n")).toBe(true);
  });
});

describe("yaml emitter", () => {
  const yaml = getFormat("yaml");

  it("writes one rule per line in block style", () => {
    expect(yaml.serialize(record)).toContain(
      ["files:", "  src/app/foo.ts:"].join("\n")
    );
    expect(yaml.serialize(record)).not.toContain("{");
  });

  it("changes exactly one line when one count changes", () => {
    const before = yaml.serialize(record).split("\n");
    const after = yaml
      .serialize({
        ...record,
        files: {
          ...record.files,
          "src/bar.ts": { "no-console": 3 },
        },
      })
      .split("\n");

    expect(after).toHaveLength(before.length);
    const changed = before.filter((line, i) => line !== after[i]);
    expect(changed).toEqual(["    no-console: 2"]);
  });

  // Keys that YAML would otherwise reinterpret. An unquoted key here silently
  // corrupts the record -- "0x1f" would come back as the number 31.
  it.each([
    "@typescript-eslint/no-explicit-any",
    "better-mutation/no-mutation",
    "src/a:b.ts",
    "src/a: b.ts",
    "0x1f",
    "017",
    "1e3",
    "2.0",
    "true",
    "TRUE",
    "Null",
    "~",
    "no",
    "off",
    ".inf",
    ".nan",
    "-lead.ts",
    "#hash.ts",
    "*star.ts",
    "&amp.ts",
    "!bang.ts",
    "|pipe.ts",
    ">gt.ts",
    "%pct.ts",
    "`tick.ts",
    "[br].ts",
    "{cur}.ts",
    '"quoted".ts',
    "'sq'.ts",
    " lead.ts",
    "trail.ts ",
    "",
  ])("quotes %j so it round-trips as a string", (key) => {
    const tricky = {
      recordVersion: 1,
      configHash: "h",
      trackedRules: [key],
      files: { [key]: { [key]: 1 } },
    };

    expect(yaml.parse(yaml.serialize(tricky))).toEqual(tricky);
  });
});
