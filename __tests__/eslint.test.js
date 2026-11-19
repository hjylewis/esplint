const eslintPkg = require("eslint");
const { resolveESLintClass } = require("../lib/eslint");

describe("resolveESLintClass", () => {
  const originalLoadESLint = eslintPkg.loadESLint;

  afterEach(() => {
    eslintPkg.loadESLint = originalLoadESLint;
  });

  it("uses loadESLint when it is available (ESLint >=8.57)", async () => {
    const FakeClass = function FakeClass() {};
    eslintPkg.loadESLint = jest.fn().mockResolvedValue(FakeClass);

    const result = await resolveESLintClass(true, "/some/dir");

    expect(eslintPkg.loadESLint).toHaveBeenCalledWith({
      useFlatConfig: true,
      cwd: "/some/dir",
    });
    expect(result).toBe(FakeClass);
  });

  it("falls back to the legacy ESLint class when loadESLint is unavailable", async () => {
    // Simulate ESLint < 8.57, which does not expose loadESLint
    eslintPkg.loadESLint = undefined;

    const result = await resolveESLintClass(false);

    expect(result).toBe(eslintPkg.ESLint);
  });
});
