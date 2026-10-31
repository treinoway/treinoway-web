import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');
const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

// Returns the declarations of the first rule with exactly this selector.
const ruleBody = (selector) => {
  const start = css.indexOf(`\n${selector} {`);
  return start === -1 ? null : css.slice(start, css.indexOf('}', start));
};

describe('mobile shell: bottom nav', () => {
  it('gives every bottom-nav item, link or popover wrapper, the same share of the bar', () => {
    expect(ruleBody('.bottom-nav-item')).toMatch(/flex:\s*1 1 0/);
    expect(ruleBody('.bottom-nav-popover-wrapper')).toMatch(/flex:\s*1 1 0/);
  });

  it('keeps horizontal padding off the flex items: padding is a minimum size and made links wider than the popover wrappers (caught by e2e/bottom-nav.spec.js)', () => {
    expect(ruleBody('.bottom-nav-item')).toMatch(/padding:\s*var\(--spacing-xs\) 0;/);
  });

  it('no longer pins items to a fixed min-width that made wrappers wider than links', () => {
    expect(ruleBody('.bottom-nav-item')).not.toMatch(/min-width:\s*64px/);
  });
});

describe('mobile shell: safe areas and viewport', () => {
  it('opts the viewport into the full screen so the safe-area insets are reported', () => {
    expect(html).toMatch(/viewport-fit=cover/);
  });

  it('pads the top bar and the bottom nav by the safe-area insets', () => {
    expect(ruleBody('.top-app-bar')).toMatch(/var\(--inset-top\)/);
    expect(ruleBody('.bottom-nav')).toMatch(/var\(--inset-bottom\)/);
  });

  it('renders the top-bar logo white, since the asset is blue on a blue gradient', () => {
    expect(ruleBody('.top-app-bar-logo')).toMatch(/filter:\s*brightness\(0\) invert\(1\)/);
  });
});

describe('mobile shell: lateral insets', () => {
  it('applies the left and right insets to the main content and the left one to the sidebar', () => {
    expect(ruleBody('.main-content-inner')).toMatch(/var\(--inset-left\)/);
    expect(ruleBody('.main-content-inner')).toMatch(/var\(--inset-right\)/);
    expect(css).toMatch(/\.sidebar \{\s*display: flex;[^}]*padding-left: var\(--inset-left\)/);
  });
});

describe('mobile shell: keyboard', () => {
  it('hides the bottom nav and frees its height while the keyboard is open', () => {
    expect(css).toMatch(/html\.keyboard-open \{\s*--bottom-nav-height: 0px;/);
    expect(css).toMatch(/html\.keyboard-open \.bottom-nav \{ display: none; \}/);
  });
});
