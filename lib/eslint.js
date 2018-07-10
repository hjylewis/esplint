function getWarningRules({ rules }) {
  return Object.keys(rules).filter(name => {
    const ruleConfig = rules[name];
    const setting = Array.isArray(ruleConfig) ? ruleConfig[0] : ruleConfig;
    return setting === "warn" || setting === 1;
  });
}

module.exports = {
  getWarningRules
};
