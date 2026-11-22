import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

// Declarations of the last rule with exactly this selector
const ruleBody = (selector) => {
  const start = css.lastIndexOf(`${selector} {`);
  return start === -1 ? null : css.slice(start, css.indexOf('}', start));
};

describe('index.css: consistency ranking layout', () => {
  it('PAN-22 keeps the pillar and weight bars from collapsing inside their column containers', () => {
    expect(ruleBody('.pillar-progress__body .score-bar__track,\n.weights-summary .score-bar__track')).toContain('flex: none');
  });

  it('PAN-04 keeps the actions column visible while the standings table scrolls', () => {
    const body = ruleBody('.consistency-table th:last-child,\n.consistency-table td:last-child');
    expect(body).toContain('position: sticky');
    expect(body).toContain('right: 0');
  });

  it('PAN-04 writes the table headers in sentence case (CPD-72)', () => {
    expect(ruleBody('.consistency-table th')).not.toContain('text-transform: uppercase');
    expect(ruleBody('.consistency-table th')).not.toContain('letter-spacing');
  });

  it('PAN-08 tints the rows of students at risk', () => {
    expect(ruleBody('.consistency-row--risk td,\n.consistency-row--risk td:last-child')).toContain('--feedback-error-bg');
  });

  it('CPD-71 paints the 100% band as the light green tag, with no solid badge variant (AD-062 supersedes PAN-10 style)', () => {
    expect(css).not.toContain('.badge--solid');
    const body = ruleBody('.badge.badge--success');
    expect(body).toContain('var(--feedback-success-bg)');
    expect(body).toContain('var(--feedback-success-text)');
  });

  it('PAN-21 draws the risk limit line dashed', () => {
    expect(ruleBody('.week-chart__limit')).toContain('dashed');
  });

  it('PAN-57 scrolls the standings table sideways inside its card with a minimum table width', () => {
    expect(ruleBody('.consistency-table__scroll')).toContain('overflow-x: auto');
    expect(ruleBody('.consistency-table')).toContain('min-width');
  });
});

const RANKING_ROOTS = ['.consistency-page', '.ds-drawer-overlay--wide', '.challenge-detail', '.challenges-page'];

// Flat rules of the stylesheet in source order, comments dropped and line endings normalized
const flatRules = () => {
  const text = css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');
  return [...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: match[1].trim().replace(/\s+/g, ' '),
    body: match[2],
    index: match.index,
  }));
};

// The rule scoped to every ranking and championship root that writes text in sentence case
const sentenceCaseRule = () => flatRules().find((rule) => RANKING_ROOTS.every((root) => rule.selector.includes(root))
  && /text-transform:\s*none/.test(rule.body));

// Last rule with exactly this selector
const lastRule = (selector) => flatRules().filter((rule) => rule.selector === selector).at(-1);

describe('ranking screens css', () => {
  it('CPD-71 shows badges in sentence case on the ranking screens', () => {
    const rule = sentenceCaseRule();
    expect(rule).toBeDefined();
    expect(rule.selector).toMatch(/[(,]\s*\.badge\s*[,)]/);
    expect(rule.body).toMatch(/letter-spacing:\s*normal/);
    const statusBadge = lastRule('.badge--status');
    expect(statusBadge.body).toMatch(/text-transform:\s*uppercase/);
    expect(rule.index).toBeGreaterThan(statusBadge.index);
  });

  it('CPD-72 drops uppercase from overlines, KPI labels and table headers on the ranking and championship screens', () => {
    const rule = sentenceCaseRule();
    expect(rule).toBeDefined();
    ['.type-overline', '.metric-card-label', '.kpi-label', '.btn-primary', '.btn-secondary'].forEach((selector) => expect(rule.selector).toContain(selector));
    expect(rule.selector).toMatch(/[(,]\s*th\s*[,)]/);
    expect(lastRule('.consistency-summary .metric-card-label').body).not.toMatch(/text-transform:\s*uppercase/);
    expect(lastRule('.consistency-table th').body).not.toMatch(/text-transform:\s*uppercase/);
    expect(lastRule('.type-overline').body).toMatch(/text-transform:\s*uppercase/);
  });
});
