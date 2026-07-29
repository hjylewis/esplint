module.exports = {
  meta: { type: "problem", schema: [] },
  create(context) {
    return {
      Identifier(node) {
        if (node.name === "foo") {
          context.report({ node, message: "Avoid foo." });
        }
      },
    };
  },
};
