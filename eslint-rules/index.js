/**
 * Local ESLint rules for the codebase's comment conventions.
 *
 * - function-header-comment: every top-level function has a header comment
 *   whose summary is one line (`// …`, or JSDoc with a one-line summary
 *   followed by tags).
 * - no-comments-in-function: no comments inside function bodies, except
 *   `// why: …`, `// deviation: …` and tool directives.
 * - disable-requires-reason: every eslint-disable states why after ` -- `.
 */

const FUNCTION_TYPES = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'])
const TOOL_DIRECTIVE = /^\s*(eslint-|eslint\s|global\s|globals\s|@ts-|istanbul\s|c8\s|prettier-ignore|TODO\b|FIXME\b)/
const ALLOWED_INNER = /^\s*(why|deviation):\s*\S/
const DISABLE_DIRECTIVE = /^\s*eslint-disable(-next-line|-line)?(\s|$)/

// True when any ancestor of node is a function.
function isInsideFunction(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (FUNCTION_TYPES.has(parent.type)) return true
  }
  return false
}

// True for a function, or a call wrapping one (memo, forwardRef, handlers).
function isFunctionLike(node) {
  if (!node) return false
  if (FUNCTION_TYPES.has(node.type)) return true
  return node.type === 'CallExpression' && node.arguments.some((arg) => FUNCTION_TYPES.has(arg.type))
}

// Wraps a declaration in its export statement when it has one.
function withExport(node) {
  return node.parent && node.parent.type.startsWith('Export') ? node.parent : node
}

// Returns the node a header comment must sit above, or null when none is required.
function headerTarget(node) {
  if (isInsideFunction(node)) return null
  if (node.type === 'FunctionDeclaration') return withExport(node)
  if (node.type === 'MethodDefinition') return node
  if (node.type === 'VariableDeclarator' && isFunctionLike(node.init)) return withExport(node.parent)
  return null
}

// Comments stacked directly above node, nearest last, tool directives dropped.
function headerChain(sourceCode, node) {
  const before = sourceCode.getCommentsBefore(node)
  const chain = []
  let nextLine = node.loc.start.line
  for (let index = before.length - 1; index >= 0 && before[index].loc.end.line === nextLine - 1; index--) {
    chain.unshift(before[index])
    nextLine = before[index].loc.start.line
  }
  return chain.filter((comment) => !TOOL_DIRECTIVE.test(comment.value))
}

// Number of summary lines in a block comment (text before the first @tag).
function summaryLineCount(blockValue) {
  const lines = blockValue.split('\n').map((line) => line.replace(/^\s*\*?\s?/, '').trim())
  const firstTag = lines.findIndex((line) => line.startsWith('@'))
  const summary = firstTag === -1 ? lines : lines.slice(0, firstTag)
  return summary.filter((line) => line !== '').length
}

// Reports a missing or multi-line header above a top-level function.
function checkHeader(context, node) {
  const target = headerTarget(node)
  if (!target) return
  const chain = headerChain(context.sourceCode, target)
  if (chain.length === 0) {
    context.report({ node, messageId: 'missing' })
    return
  }
  const isOneLine = chain.length === 1 && (chain[0].type === 'Line' || summaryLineCount(chain[0].value) === 1)
  if (!isOneLine) context.report({ node, messageId: 'multiLine' })
}

// Source ranges of every function body in the file.
function functionBodyRanges(sourceCode) {
  const ranges = []
  const visit = (node) => {
    if (FUNCTION_TYPES.has(node.type)) ranges.push(node.body.range)
    for (const key of sourceCode.visitorKeys[node.type] || []) {
      const child = node[key]
      if (Array.isArray(child)) child.forEach((item) => item && visit(item))
      else if (child && typeof child.type === 'string') visit(child)
    }
  }
  visit(sourceCode.ast)
  return ranges
}

const functionHeaderComment = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Require a one-line header comment above every top-level function' },
    schema: [],
    messages: {
      missing: 'Add a one-line comment above this function saying what it does.',
      multiLine: 'Header comment must be a single line (`// …`), or JSDoc whose summary is one line before its @tags.',
    },
  },
  create(context) {
    const check = (node) => checkHeader(context, node)
    return { FunctionDeclaration: check, MethodDefinition: check, VariableDeclarator: check }
  },
}

const noCommentsInFunction = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow comments inside function bodies except why:/deviation: notes and tool directives' },
    schema: [],
    messages: {
      inner:
        'No comments inside functions: extract a well-named function instead. Only `// why: …` (non-obvious reason), `// deviation: …` or tool directives are allowed.',
    },
  },
  create(context) {
    return {
      'Program:exit'() {
        const ranges = functionBodyRanges(context.sourceCode)
        for (const comment of context.sourceCode.getAllComments()) {
          if (TOOL_DIRECTIVE.test(comment.value) || ALLOWED_INNER.test(comment.value)) continue
          const [start, end] = comment.range
          if (ranges.some(([from, to]) => start > from && end < to)) context.report({ loc: comment.loc, messageId: 'inner' })
        }
      },
    }
  },
}

const disableRequiresReason = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Require a reason on every eslint-disable directive' },
    schema: [],
    messages: { reason: 'State why the rule is disabled: `eslint-disable-next-line <rule> -- <reason>`.' },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (DISABLE_DIRECTIVE.test(comment.value) && !/\s--\s+\S/.test(comment.value)) {
            context.report({ loc: comment.loc, messageId: 'reason' })
          }
        }
      },
    }
  },
}

export default {
  meta: { name: 'local' },
  rules: {
    'function-header-comment': functionHeaderComment,
    'no-comments-in-function': noCommentsInFunction,
    'disable-requires-reason': disableRequiresReason,
  },
}
