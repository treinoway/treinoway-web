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

  it('PAN-04 writes the table headers in uppercase', () => {
    expect(ruleBody('.consistency-table th')).toContain('text-transform: uppercase');
  });

  it('PAN-08 tints the rows of students at risk', () => {
    expect(ruleBody('.consistency-row--risk td,\n.consistency-row--risk td:last-child')).toContain('--feedback-error-bg');
  });

  it('PAN-10 paints the 100% band solid blue with white text', () => {
    const body = ruleBody('.badge.badge--solid');
    expect(body).toContain('var(--action-primary-default)');
    expect(body).toContain('var(--text-inverse)');
  });

  it('PAN-21 draws the risk limit line dashed', () => {
    expect(ruleBody('.week-chart__limit')).toContain('dashed');
  });

  it('PAN-57 scrolls the standings table sideways inside its card with a minimum table width', () => {
    expect(ruleBody('.consistency-table__scroll')).toContain('overflow-x: auto');
    expect(ruleBody('.consistency-table')).toContain('min-width');
  });
});
