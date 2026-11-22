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

  it('CPD-34 leaves the last header cell of the championship tables unpainted and aligned with its values', () => {
    const body = ruleBody('.challenge-table thead th:last-child');
    expect(body).toContain('background: transparent');
    expect(body).toContain('text-align: left');
  });

  it('CPD-45 draws the icons of the championship empty blocks blue in a light-blue circle', () => {
    const body = ruleBody('.championship-tab .empty-block__icon');
    expect(body).toContain('background: var(--background-brand-subtle)');
    expect(body).toContain('color: var(--icon-brand)');
  });

  it('CPD-25 draws the participant modes as pills, the chosen one filled blue and the others outlined', () => {
    const pillStart = css.indexOf('.choice-pill {');
    const pill = css.slice(pillStart, css.indexOf('}', pillStart));
    expect(pill).toContain('border: 1px solid var(--border-default)');
    expect(pill).toContain('border-radius: var(--radius-full)');
    expect(pill).toContain('background: var(--background-surface)');
    const selected = ruleBody('.choice-pill.choice-pill--selected,\n.choice-pill.choice-pill--selected:hover:not(:disabled)');
    expect(selected).toContain('background: var(--action-primary-default)');
    expect(selected).toContain('color: var(--text-inverse)');
  });

  it('CPD-41 keeps the pillar rows of the rules card legible: identity over the slider row, never the six-column row', () => {
    expect(ruleBody('.scoring-rules-card .weight-row')).toContain('grid-template-columns: auto minmax(0, 1fr) auto auto');
    expect(ruleBody('.scoring-rules-card .weight-row__identity')).toContain('grid-column: 2 / span 2');
    expect(ruleBody('.scoring-rules-card .weight-row__slider')).toContain('grid-row: 2');
  });

  it('CPD-41 draws the XP rules as plain rows with a white bordered field, also while locked', () => {
    expect(ruleBody('.scoring-rules-card .scoring-rule-row')).toContain('background: transparent');
    const locked = ruleBody('.scoring-rules-card .scoring-rule-row__input:disabled');
    expect(locked).toContain('background: var(--background-surface)');
    expect(locked).toContain('color: var(--text-primary)');
  });

  it('CPD-33 draws the 1st place avatar as a white circle on the blue leader card', () => {
    expect(css).toContain('.championship-podium__place--leader { background: var(--background-brand-subtle); }');
    expect(ruleBody('.championship-podium__place--leader .avatar')).toContain('background: var(--background-surface)');
  });
});
