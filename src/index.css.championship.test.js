import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

// Declarations of the last rule with exactly this selector
const ruleBody = (selector) => {
  const start = css.lastIndexOf(`${selector} {`);
  return start === -1 ? null : css.slice(start, css.indexOf('}', start));
};

describe('index.css: championship screens against the captures', () => {
  it('CPD-44 draws the neutral button white with a visible border and dark text, above the base button rule', () => {
    const body = ruleBody('.btn.btn--neutral');
    expect(body).toContain('background: var(--background-surface)');
    expect(body).toContain('border-color: var(--border-default)');
    expect(body).toContain('color: var(--text-primary)');
    expect(css.indexOf('.btn.btn--neutral {')).toBeGreaterThan(css.indexOf('.btn:is(.btn--primary, .btn--secondary, .btn--neutral'));
  });
});
