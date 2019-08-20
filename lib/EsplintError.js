class EsplintError extends Error {
  constructor(...args) {
    super(...args);
    this.name = "EsplintError";
  }
}

module.exports = EsplintError;
