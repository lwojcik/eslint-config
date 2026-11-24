const DEFAULT_ESCAPE_FUNCTION = 'escape';

const isHrefMember = ({ property, computed }) =>
  computed
    ? property.type === 'Literal' && property.value === 'href'
    : property.type === 'Identifier' && property.name === 'href';

const isLocationObject = ({ object }) =>
  (object.type === 'Identifier' && object.name === 'location') ||
  (object.type === 'MemberExpression' &&
    !object.computed &&
    object.property.type === 'Identifier' &&
    object.property.name === 'location');

const isEscaped = ({ right }, { sourceCode, escapeFunction }) =>
  right.type === 'CallExpression' &&
  sourceCode.getText(right.callee) === escapeFunction;

const noLocationHrefAssign = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow location.href assignment (prevent possible XSS)',
    },
    messages: {
      unsafe:
        'Dangerous location.href assignment can lead to XSS. Please use {{escapeFunction}}({{source}}) as a wrapper for escaping',
    },
    schema: [
      {
        type: 'object',
        properties: { escapeFunc: { type: 'string' } },
        additionalProperties: false,
      },
    ],
  },
  create: (context) => {
    const escapeFunction =
      context.options[0]?.escapeFunc ?? DEFAULT_ESCAPE_FUNCTION;
    const { sourceCode } = context;

    return {
      AssignmentExpression: (node) => {
        const { left } = node;

        if (
          left.type !== 'MemberExpression' ||
          !isHrefMember(left) ||
          !isLocationObject(left) ||
          isEscaped(node, { sourceCode, escapeFunction })
        ) {
          return;
        }

        context.report({
          node,
          messageId: 'unsafe',
          data: { escapeFunction, source: sourceCode.getText(node.right) },
        });
      },
    };
  },
};

export default {
  meta: { name: 'xss' },
  rules: { 'no-location-href-assign': noLocationHrefAssign },
};
