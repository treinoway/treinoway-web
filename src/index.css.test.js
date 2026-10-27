import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

// Returns the declarations of the first rule with exactly this selector.
const ruleBody = (selector, from = 0) => {
  const start = css.indexOf(`${selector} {`, from);
  return start === -1 ? null : css.slice(start, css.indexOf('}', start));
};

describe('index.css: dashboard action card and iArnold focus', () => {
  it('shows the action card description again from 768px, in caption type', () => {
    const media = css.indexOf('@media (min-width: 768px) {\n  .quick-action-card {');
    const body = ruleBody('  .quick-action-desc', media);

    expect(body).toContain('display: block');
    expect(body).toContain('var(--text-secondary)');
    expect(body).toContain('var(--font-size-12)');
  });

  it('keeps the description hidden on mobile', () => {
    expect(ruleBody('.quick-action-desc')).toContain('display: none');
  });

  it.each(['.quick-action-card:focus-visible', '.ai-fab:focus-visible', '.ai-history__open:focus-visible', '.ai-chat__composer:focus-within'])(
    '%s uses the design-system focus ring',
    (selector) => {
      expect(ruleBody(selector)).toContain('box-shadow: var(--focus-ring)');
    }
  );

  it('shows the composer focus once, on the container (border-focus + focus ring, SKILL 4.6)', () => {
    const container = ruleBody('.ai-chat__composer:focus-within');
    expect(container).toContain('border-color: var(--border-focus)');
    expect(container).toContain('box-shadow: var(--focus-ring)');

    const input = ruleBody('.ai-chat__composer .ai-chat__input');
    expect(input).toContain('border: none');
    expect(input).toContain('box-shadow: none');
    expect(input).toContain('resize: none');
    expect(ruleBody('.ai-chat__composer .ai-chat__input:hover:not(:disabled),\n.ai-chat__composer .ai-chat__input:focus-visible')).toContain('box-shadow: none');
  });

  it('keeps the sidebar iArnold badge free of the brand accent orange', () => {
    expect(ruleBody('.sidebar-link-badge')).not.toContain('brand-accent');
  });
});
