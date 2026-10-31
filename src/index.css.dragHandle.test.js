import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

// Returns the declarations of the first rule with exactly this selector.
const ruleBody = (selector) => {
  const start = css.indexOf(`\n${selector} {`);
  return start === -1 ? null : css.slice(start, css.indexOf('}', start));
};

describe('index.css: exercise drag handle on touch screens', () => {
  const body = ruleBody('.exercise-drag-handle');

  it('declares a rule for the handle', () => {
    expect(body).not.toBeNull();
  });

  it('has a 44x44 touch target through the touch-control token', () => {
    expect(body).toMatch(/min-width:\s*var\(--size-control-touch\)/);
    expect(body).toMatch(/min-height:\s*var\(--size-control-touch\)/);
  });

  it('disables text selection so a touch on the handle starts the drag', () => {
    expect(body).toMatch(/user-select:\s*none/);
  });
});
