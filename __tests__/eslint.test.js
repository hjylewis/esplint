const fs = require("fs");
const eslintPkg = require("eslint");
const { shouldUseFlatConfig, resolveESLintClass } = require("../lib/eslint");

describe("shouldUseFlatConfig", () => {
  const originalEnv = process.env.ESLINT_USE_FLAT_CONFIG;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.ESLINT_USE_FLAT_CONFIG;
    } else {
      process.env.ESLINT_USE_FLAT_CONFIG = originalEnv;
    }
    jest.restoreAllMocks();
  });

  it("returns the explicit override when it is a boolean", () => {
    // override wins even when the env var says otherwise
    process.env.ESLINT_USE_FLAT_CONFIG = "false";
    expect(shouldUseFlatConfig("/some/dir", true)).toEqual(true);
    expect(shouldUseFlatConfig("/some/dir", false)).toEqual(false);
  });

  it('uses flat config when ESLINT_USE_FLAT_CONFIG is "true"', () => {
    process.env.ESLINT_USE_FLAT_CONFIG = "true";
    expect(shouldUseFlatConfig("/some/dir")).toEqual(true);
  });

  it('uses legacy config when ESLINT_USE_FLAT_CONFIG is "false"', () => {
    process.env.ESLINT_USE_FLAT_CONFIG = "false";
    // A flat config file would otherwise be detected, but the env var wins
    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    expect(shouldUseFlatConfig("/some/dir")).toEqual(false);
  });

  it("detects a flat config file in the working directory", () => {
    delete process.env.ESLINT_USE_FLAT_CONFIG;
    jest
      .spyOn(fs, "existsSync")
      .mockImplementation((p) => p.endsWith("eslint.config.js"));
    expect(shouldUseFlatConfig("/some/dir")).toEqual(true);
  });

  it("falls back to legacy when no flat config file is present", () => {
    delete process.env.ESLINT_USE_FLAT_CONFIG;
    jest.spyOn(fs, "existsSync").mockReturnValue(false);
    expect(shouldUseFlatConfig("/some/dir")).toEqual(false);
  });
});

describe("resolveESLintClass", () => {
  const originalLoadESLint = eslintPkg.loadESLint;

  afterEach(() => {
    eslintPkg.loadESLint = originalLoadESLint;
  });

  it("uses loadESLint when it is available (ESLint >=8.18 / v9)", async () => {
    const FakeClass = function FakeClass() {};
    eslintPkg.loadESLint = jest.fn().mockResolvedValue(FakeClass);

    const result = await resolveESLintClass(true);

    expect(eslintPkg.loadESLint).toHaveBeenCalledWith({ useFlatConfig: true });
    expect(result).toBe(FakeClass);
  });

  it("falls back to the legacy ESLint class when loadESLint is unavailable", async () => {
    // Simulate ESLint < 8.18, which does not expose loadESLint
    eslintPkg.loadESLint = undefined;

    const result = await resolveESLintClass(false);

    expect(result).toBe(eslintPkg.ESLint);
  });
});
