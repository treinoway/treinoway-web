import { describe, it, expect } from 'vitest';
import { render, screen, within } from '../../test/test-utils';
import PillarTable from './PillarTable';

const DESKTOP_ONLY = 'table-col-desktop-only';

// Pillar score with the fields of the trainer API
const pillar = (name, pillarLabel, score) => ({ pillar: name, pillarLabel, score });

// Answered feedback of the given milestone day, submitted on that day of November 2026
const answered = (day, overallIndex, pillars) => ({
  id: `fb-${day}`,
  milestone: `D${day}`,
  milestoneLabel: `D${day}`,
  status: 'answered',
  submittedAt: `2026-11-${String(day).padStart(2, '0')}T12:00:00.000Z`,
  overallIndex,
  pillars,
});

// Renders the table for the given answered feedbacks and returns it
const renderTable = (feedbacks) => {
  render(<PillarTable answered={feedbacks} />);
  return screen.getByRole('table', { name: 'Pilares por envio' });
};

// Names of the body rows, in the order shown
const rowNames = (table) => within(table).getAllByRole('rowheader').map((header) => header.textContent);

// Score cells of the row with the given name, one per answered milestone
const cellsOf = (table, name) => {
  const row = within(table).getAllByRole('row').find((candidate) => within(candidate).queryByRole('rowheader', { name }));
  return within(row).getAllByRole('cell');
};

// Milestone column headers, without the "Pilar" one
const milestoneHeaders = (table) => within(table).getAllByRole('columnheader').slice(1);

describe('PillarTable: columns', () => {
  it('shows the "Pilar" column and one column per answered milestone, in the order received', () => {
    const table = renderTable([
      answered(7, 55, [pillar('sleep', 'Sono', 50)]),
      answered(21, 77, [pillar('sleep', 'Sono', 40)]),
    ]);

    const headers = within(table).getAllByRole('columnheader');
    expect(headers).toHaveLength(3);
    expect(headers[0]).toHaveTextContent('Pilar');
    expect(headers[1]).toHaveTextContent(/^7 dias/);
    expect(headers[2]).toHaveTextContent(/^21 dias/);
  });

  it('names each milestone column with the web label, not the label the service sent', () => {
    const table = renderTable([
      answered(7, 55, [pillar('sleep', 'Sono', 50)]),
      { ...answered(9, 60, [pillar('sleep', 'Sono', 60)]), milestone: 'ADHOC', milestoneLabel: 'Avulso' },
    ]);

    const [first, second] = milestoneHeaders(table);
    expect(first).toHaveTextContent(/^7 dias/);
    expect(first).not.toHaveTextContent('D7');
    expect(second).toHaveTextContent(/^Envio manual/);
    expect(second).not.toHaveTextContent('Avulso');
  });

  it('names the column with the label the service sent for a milestone the app does not know', () => {
    const table = renderTable([{ ...answered(9, 60, [pillar('sleep', 'Sono', 60)]), milestone: 'D60', milestoneLabel: '60 dias' }]);

    expect(milestoneHeaders(table)[0]).toHaveTextContent(/^60 dias/);
  });

  it('shows the date the student answered under each milestone', () => {
    const table = renderTable([
      answered(7, 55, [pillar('sleep', 'Sono', 50)]),
      answered(21, 77, [pillar('sleep', 'Sono', 40)]),
    ]);

    const [first, second] = milestoneHeaders(table);
    expect(within(first).getByText('07/11/2026')).toBeInTheDocument();
    expect(within(second).getByText('21/11/2026')).toBeInTheDocument();
  });

  it('shows a dash under a milestone without an answer date', () => {
    const table = renderTable([{ ...answered(7, 55, [pillar('sleep', 'Sono', 50)]), submittedAt: null }]);

    expect(within(milestoneHeaders(table)[0]).getByText('-')).toBeInTheDocument();
  });
});

describe('PillarTable: progressive disclosure on a phone', () => {
  const FOUR = [
    answered(7, 50, [pillar('sleep', 'Sono', 50)]),
    answered(15, 60, [pillar('sleep', 'Sono', 60)]),
    answered(21, 70, [pillar('sleep', 'Sono', 70)]),
    answered(30, 80, [pillar('sleep', 'Sono', 80)]),
  ];

  it('marks every milestone header but the two most recent as desktop only', () => {
    const table = renderTable(FOUR);

    const [day7, day15, day21, day30] = milestoneHeaders(table);
    expect(day7).toHaveClass(DESKTOP_ONLY);
    expect(day15).toHaveClass(DESKTOP_ONLY);
    expect(day21).not.toHaveClass(DESKTOP_ONLY);
    expect(day30).not.toHaveClass(DESKTOP_ONLY);
  });

  it('marks the same older columns in each pillar row and in the overall row', () => {
    const table = renderTable(FOUR);

    ['Sono', 'Índice geral'].forEach((name) => {
      const cells = cellsOf(table, name);
      expect(cells).toHaveLength(4);
      expect(cells[0]).toHaveClass(DESKTOP_ONLY);
      expect(cells[1]).toHaveClass(DESKTOP_ONLY);
      expect(cells[2]).not.toHaveClass(DESKTOP_ONLY);
      expect(cells[3]).not.toHaveClass(DESKTOP_ONLY);
    });
  });

  it('never hides the "Pilar" column nor the row names', () => {
    const table = renderTable(FOUR);

    expect(within(table).getAllByRole('columnheader')[0]).not.toHaveClass(DESKTOP_ONLY);
    within(table).getAllByRole('rowheader').forEach((header) => expect(header).not.toHaveClass(DESKTOP_ONLY));
  });

  it('hides only the oldest column when there are three answered milestones', () => {
    const table = renderTable(FOUR.slice(0, 3));

    const [day7, day15, day21] = milestoneHeaders(table);
    expect(day7).toHaveClass(DESKTOP_ONLY);
    expect(day15).not.toHaveClass(DESKTOP_ONLY);
    expect(day21).not.toHaveClass(DESKTOP_ONLY);
    const cells = cellsOf(table, 'Sono');
    expect(cells[0]).toHaveClass(DESKTOP_ONLY);
    expect(cells[1]).not.toHaveClass(DESKTOP_ONLY);
    expect(cells[2]).not.toHaveClass(DESKTOP_ONLY);
  });

  it.each([1, 2])('hides no column when there are only %i answered milestones', (count) => {
    const table = renderTable(FOUR.slice(0, count));

    milestoneHeaders(table).forEach((header) => expect(header).not.toHaveClass(DESKTOP_ONLY));
    cellsOf(table, 'Sono').forEach((cell) => expect(cell).not.toHaveClass(DESKTOP_ONLY));
    cellsOf(table, 'Índice geral').forEach((cell) => expect(cell).not.toHaveClass(DESKTOP_ONLY));
  });
});

describe('PillarTable: rows', () => {
  it('orders the pillars by the fixed display order and closes with the overall index', () => {
    const table = renderTable([
      answered(7, 55, [
        pillar('other', 'Outro', 10),
        pillar('report', 'Relato', 20),
        pillar('hydration', 'Hidratação', 30),
        pillar('sleep', 'Sono', 40),
        pillar('routine', 'Rotina', 50),
        pillar('evolution', 'Evolução', 60),
        pillar('diet_adherence', 'Adesão (plano alimentar)', 70),
        pillar('training_adherence', 'Adesão (treino)', 80),
      ]),
    ]);

    expect(rowNames(table)).toEqual([
      'Adesão (treino)',
      'Adesão (plano alimentar)',
      'Evolução',
      'Rotina',
      'Sono',
      'Hidratação',
      'Relato',
      'Outro',
      'Índice geral',
    ]);
  });

  it('puts pillars the app does not know after the known ones and before the overall index', () => {
    const table = renderTable([
      answered(7, 55, [pillar('mood', 'Humor', 90), pillar('other', 'Outro', 10), pillar('stress', 'Estresse', 30), pillar('sleep', 'Sono', 40)]),
    ]);

    expect(rowNames(table)).toEqual(['Sono', 'Outro', 'Humor', 'Estresse', 'Índice geral']);
  });

  it('includes a pillar scored only in a later milestone, in its fixed position', () => {
    const table = renderTable([
      answered(7, 55, [pillar('sleep', 'Sono', 50)]),
      answered(21, 77, [pillar('sleep', 'Sono', 40), pillar('training_adherence', 'Adesão (treino)', 80)]),
    ]);

    expect(rowNames(table)).toEqual(['Adesão (treino)', 'Sono', 'Índice geral']);
  });

  it('shows only the overall index row when no pillar was scored', () => {
    const table = renderTable([answered(7, 55, [])]);

    expect(rowNames(table)).toEqual(['Índice geral']);
    expect(cellsOf(table, 'Índice geral')[0]).toHaveTextContent('55');
  });
});

describe('PillarTable: scores and variation', () => {
  const THREE = [
    answered(7, 55, [pillar('training_adherence', 'Adesão (treino)', 60), pillar('sleep', 'Sono', 50), pillar('routine', 'Rotina', 70)]),
    answered(15, 55, [pillar('training_adherence', 'Adesão (treino)', 80), pillar('sleep', 'Sono', 40), pillar('routine', 'Rotina', 70)]),
    answered(21, 77, [pillar('training_adherence', 'Adesão (treino)', 80), pillar('sleep', 'Sono', 45)]),
  ];

  it('shows the first milestone without a variation', () => {
    const table = renderTable(THREE);

    ['Adesão (treino)', 'Sono', 'Rotina', 'Índice geral'].forEach((name) => {
      const [first] = cellsOf(table, name);
      expect(first.textContent.trim()).toMatch(/^\d+$/);
    });
  });

  it('shows a gain as "+N" in a success tag', () => {
    const table = renderTable(THREE);

    const badge = within(cellsOf(table, 'Adesão (treino)')[1]).getByText('+20');
    expect(badge).toHaveClass('badge', 'badge--tag', 'badge--success');
    expect(cellsOf(table, 'Adesão (treino)')[1]).toHaveTextContent('80');
  });

  it('shows a loss as "−N", with the typographic minus, in an error tag', () => {
    const table = renderTable(THREE);

    const badge = within(cellsOf(table, 'Sono')[1]).getByText('−10');
    expect(badge).toHaveClass('badge', 'badge--tag', 'badge--error');
    expect(cellsOf(table, 'Sono')[1]).toHaveTextContent('40');
  });

  it('shows an unchanged pillar score as a variation of "0" in a neutral tag', () => {
    const table = renderTable(THREE);

    const cell = cellsOf(table, 'Rotina')[1];
    expect(within(cell).getByText('70')).toBeInTheDocument();
    expect(within(cell).getByText('0')).toHaveClass('badge', 'badge--tag', 'badge--neutral');
  });

  it('shows an unchanged overall index as a variation of "0" in a neutral tag, then the next gain', () => {
    const table = renderTable(THREE);

    const [first, second, third] = cellsOf(table, 'Índice geral');
    expect(first.textContent.trim()).toBe('55');
    expect(within(second).getByText('55')).toBeInTheDocument();
    expect(within(second).getByText('0')).toHaveClass('badge--tag', 'badge--neutral');
    expect(within(third).getByText('77')).toBeInTheDocument();
    expect(within(third).getByText('+22')).toHaveClass('badge--success');
  });

  it('shows a lone dash where a milestone did not score the pillar', () => {
    const table = renderTable(THREE);

    expect(cellsOf(table, 'Rotina')[2].textContent.trim()).toBe('-');
  });

  it('shows no variation on the milestone right after one without a score', () => {
    const table = renderTable([
      answered(7, 55, [pillar('sleep', 'Sono', 50)]),
      answered(15, 60, []),
      answered(21, 77, [pillar('sleep', 'Sono', 45)]),
    ]);

    const [first, second, third] = cellsOf(table, 'Sono');
    expect(first.textContent.trim()).toBe('50');
    expect(second.textContent.trim()).toBe('-');
    expect(third.textContent.trim()).toBe('45');
  });

  it('shows a score of zero as "0" and compares against it', () => {
    const table = renderTable([
      answered(7, 10, [pillar('sleep', 'Sono', 0)]),
      answered(15, 20, [pillar('sleep', 'Sono', 30)]),
    ]);

    const [first, second] = cellsOf(table, 'Sono');
    expect(first.textContent.trim()).toBe('0');
    expect(within(second).getByText('+30')).toBeInTheDocument();
  });
});
