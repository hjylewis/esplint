const { hasGitConflict, resolveGitConflict } = require("../lib/gitConflict");

function conflicted(ours, theirs) {
  return [
    "<<<<<<< HEAD",
    JSON.stringify(ours, null, 2),
    "=======",
    JSON.stringify(theirs, null, 2),
    ">>>>>>> branch",
  ].join("\n");
}

describe("hasGitConflict", () => {
  it("detects conflict markers", () => {
    expect(hasGitConflict(conflicted({ a: 1 }, { a: 2 }))).toBeTruthy();
  });

  it("ignores clean files", () => {
    expect(hasGitConflict(JSON.stringify({ a: 1 }))).toBeFalsy();
  });
});

describe("resolveGitConflict", () => {
  it("keeps the higher count when both sides changed a rule", () => {
    // Taking the lower count would raise the allowance and let a regression
    // slip through until the next full run.
    const resolved = resolveGitConflict(
      conflicted(
        { files: { "a.js": { "no-console": 5 } } },
        { files: { "a.js": { "no-console": 3 } } }
      )
    );

    expect(resolved.files["a.js"]["no-console"]).toEqual(5);
  });

  it("keeps the higher count regardless of which side is larger", () => {
    const resolved = resolveGitConflict(
      conflicted(
        { files: { "a.js": { "no-console": 2 } } },
        { files: { "a.js": { "no-console": 9 } } }
      )
    );

    expect(resolved.files["a.js"]["no-console"]).toEqual(9);
  });

  it("unions files and rules that only one side has", () => {
    const resolved = resolveGitConflict(
      conflicted(
        { files: { "a.js": { "no-console": 1 } } },
        { files: { "b.js": { eqeqeq: 2 } } }
      )
    );

    expect(resolved.files).toEqual({
      "a.js": { "no-console": 1 },
      "b.js": { eqeqeq: 2 },
    });
  });

  it("preserves regions common to both sides", () => {
    const file = [
      "{",
      '  "recordVersion": 1,',
      "<<<<<<< HEAD",
      '  "files": { "a.js": { "no-console": 1 } }',
      "=======",
      '  "files": { "a.js": { "no-console": 4 } }',
      ">>>>>>> branch",
      "}",
    ].join("\n");

    const resolved = resolveGitConflict(file);
    expect(resolved.recordVersion).toEqual(1);
    expect(resolved.files["a.js"]["no-console"]).toEqual(4);
  });
});
