import { RuleTester } from 'eslint'
import local from './index.js'

const { rules } = local

RuleTester.describe = describe
RuleTester.it = it
RuleTester.itOnly = it.only

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: 'module' } })

ruleTester.run('function-header-comment', rules['function-header-comment'], {
  valid: [
    '// Adds two numbers.\nfunction add(a, b) { return a + b; }',
    '// Adds two numbers.\nexport async function add(a, b) { return a + b; }',
    '/**\n * Adds two numbers.\n * @param {number} a\n * @returns {number}\n */\nexport function add(a) { return a; }',
    '/** Adds two numbers. */\nexport const add = (a, b) => a + b;',
    '// Adds two numbers.\n// eslint-disable-next-line no-unused-vars -- kept for the public API\nfunction add(a, b) { return a + b; }',
    '// Wrapped handler.\nconst handler = wrap(async () => {});',
    '// Outer.\nfunction outer() { return function inner() {}; }',
    'const value = 42;',
    '// A class.\nclass Repo {\n  // Finds a row.\n  find() {}\n}',
  ],
  invalid: [
    { code: 'function add(a, b) { return a + b; }', errors: [{ messageId: 'missing' }] },
    { code: 'export const add = (a, b) => a + b;', errors: [{ messageId: 'missing' }] },
    { code: '// Adds\n\nfunction add() {}', errors: [{ messageId: 'missing' }] },
    { code: '// Adds two numbers\n// and returns the sum.\nfunction add() {}', errors: [{ messageId: 'multiLine' }] },
    {
      code: '/**\n * Adds two numbers\n * and returns the sum.\n * @param {number} a\n */\nfunction add(a) { return a; }',
      errors: [{ messageId: 'multiLine' }],
    },
    { code: 'class Repo {\n  find() {}\n}', errors: [{ messageId: 'missing' }] },
  ],
})

ruleTester.run('no-comments-in-function', rules['no-comments-in-function'], {
  valid: [
    '// Header.\nfunction run() { return 1; }',
    'function run() {\n  // why: the provider rejects batches over 100 items\n  return 1;\n}',
    'function run() {\n  // deviation: legacy error shape kept for the mobile client\n  return 1;\n}',
    'function run() {\n  // eslint-disable-next-line no-console -- debug output\n  console.log(1);\n}',
    'function run() {\n  // TODO: remove after migration\n  return 1;\n}',
    '/* top-level note */\nconst value = 1;',
  ],
  invalid: [
    { code: 'function run() {\n  // remove non-digits\n  return 1;\n}', errors: [{ messageId: 'inner' }] },
    { code: 'const run = () => {\n  /* block */\n  return 1;\n};', errors: [{ messageId: 'inner' }] },
    { code: 'function run() {\n  // why:\n  return 1;\n}', errors: [{ messageId: 'inner' }] },
    {
      code: 'function outer() {\n  // Inner helper.\n  function inner() {}\n  return inner;\n}',
      errors: [{ messageId: 'inner' }],
    },
  ],
})

ruleTester.run('disable-requires-reason', rules['disable-requires-reason'], {
  valid: [
    '// eslint-disable-next-line no-console -- debug output\nconsole.log(1);',
    '/* eslint-disable no-console -- CLI script */\nconsole.log(1);',
    '// eslint-enable no-console\nconst value = 1;',
  ],
  invalid: [
    { code: '// eslint-disable-next-line no-console\nconsole.log(1);', errors: [{ messageId: 'reason' }] },
    { code: '/* eslint-disable no-console */\nconsole.log(1);', errors: [{ messageId: 'reason' }] },
    { code: 'console.log(1); // eslint-disable-line no-console', errors: [{ messageId: 'reason' }] },
  ],
})
