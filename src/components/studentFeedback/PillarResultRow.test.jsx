import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import PillarResultRow from './PillarResultRow';

const DS = { Badge: 'badge', Meter: 'meter' };

const SLEEP_QUESTION = 'Como foi a qualidade do seu sono nesta semana?';
const ANSWERS_TITLE = 'O que o aluno respondeu';
const SLEEP_ANSWERS = [{ questionId: 'q-2', question: SLEEP_QUESTION, type: 'stars', typeLabel: 'Estrelas', value: 2, max: 5, inverted: false }];

// Pillar of the latest feedback as the block hands it to the row; overrides replace any field
const buildPillar = (overrides = {}) => ({
  pillar: 'sleep',
  pillarLabel: 'Sono',
  score: 25,
  band: 'attention',
  bandLabel: 'Atenção',
  delta: null,
  answers: [],
  ...overrides,
});

// Renders the row inside a list and returns its list item
const renderRow = (overrides) => {
  render(<ul><PillarResultRow pillar={buildPillar(overrides)} /></ul>);
  return screen.getByRole('listitem');
};

// The button that expands the answers of the pillar
const expandButton = () => screen.getByRole('button', { name: /^Sono/ });

describe('PillarResultRow: summary', () => {
  it('shows the name, the score "de 100", a meter announced with its scale and the band', () => {
    const row = renderRow();

    expect(row).toHaveTextContent(/^Sono\s*25 de 100\s*Atenção$/);
    expect(within(row).getByRole('img', { name: '25 de 100' })).toHaveClass(DS.Meter);
    expect(within(row).getByText('Atenção')).toHaveClass(DS.Badge);
  });

  it.each([
    ['attention', 'Atenção', 25, 'meter--danger', 'badge--error'],
    ['stable', 'Estável', 60, 'meter--warning', 'badge--warning'],
    ['good', 'Bom', 90, 'meter--success', 'badge--success'],
  ])('colors the meter and the badge of the band %s', (band, bandLabel, score, meterClass, badgeClass) => {
    const row = renderRow({ band, bandLabel, score });

    expect(within(row).getByRole('img', { name: `${score} de 100` })).toHaveClass(meterClass);
    expect(within(row).getByText(bandLabel)).toHaveClass(DS.Badge, badgeClass);
  });

  it('shows a band the app does not know with the label of the service, a neutral badge and a neutral meter', () => {
    const row = renderRow({ band: 'excellent', bandLabel: 'Excelente', score: 99 });

    expect(within(row).getByRole('img', { name: '99 de 100' })).toHaveClass('meter--neutral');
    expect(within(row).getByText('Excelente')).toHaveClass(DS.Badge, 'badge--neutral');
  });

  it('keeps a score of zero as a value with its meter', () => {
    const row = renderRow({ score: 0 });

    expect(row).toHaveTextContent(/^Sono\s*0 de 100\s*Atenção$/);
    expect(within(row).getByRole('img', { name: '0 de 100' })).toBeInTheDocument();
  });
});

describe('PillarResultRow: variation', () => {
  it('shows no variation when there is none to compare', () => {
    const row = renderRow({ delta: null });

    expect(row).toHaveTextContent(/^Sono\s*25 de 100\s*Atenção$/);
  });

  it('shows a loss with the typographic minus in an error badge', () => {
    const row = renderRow({ delta: -25 });

    expect(within(row).getByText('−25')).toHaveClass(DS.Badge, 'badge--error');
  });

  it('shows a gain with a plus sign in a success badge', () => {
    const row = renderRow({ delta: 10 });

    expect(within(row).getByText('+10')).toHaveClass(DS.Badge, 'badge--success');
  });

  it('shows no change as "0" in a neutral badge', () => {
    const row = renderRow({ delta: 0 });

    expect(within(row).getByText('0')).toHaveClass(DS.Badge, 'badge--neutral');
  });
});

describe('PillarResultRow: missing score or band', () => {
  it.each([[null], [undefined]])('shows "Sem nota" with no meter and no number when the score is %s', (score) => {
    const row = renderRow({ score, band: null, bandLabel: null });

    expect(row).toHaveTextContent(/^Sono\s*Sem nota$/);
    expect(within(row).queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows the score with a neutral meter and no band badge when the service sent no band', () => {
    const row = renderRow({ band: null, bandLabel: null });

    expect(row).toHaveTextContent(/^Sono\s*25 de 100$/);
    expect(within(row).getByRole('img', { name: '25 de 100' })).toHaveClass('meter--neutral');
  });

  it('shows the score the same way for a pillar in the shape the service sent before the bands', () => {
    render(<ul><PillarResultRow pillar={{ pillar: 'sleep', pillarLabel: 'Sono', score: 25, delta: null }} /></ul>);

    expect(screen.getByRole('listitem')).toHaveTextContent(/^Sono\s*25 de 100$/);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('still expands the answers of a pillar without a score', async () => {
    const user = userEvent.setup();
    const row = renderRow({ score: null, band: null, bandLabel: null, answers: SLEEP_ANSWERS });

    await user.click(expandButton());

    expect(within(row).getByText('Sem nota')).toBeInTheDocument();
    expect(within(row).getByText(SLEEP_QUESTION)).toBeInTheDocument();
  });
});

describe('PillarResultRow: answers behind the score', () => {
  it.each([
    ['an empty list', []],
    ['no list', undefined],
    ['null', null],
  ])('is not a button when the service sent %s of answers', (_label, answers) => {
    const row = renderRow({ answers });

    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
    expect(within(row).queryByText(ANSWERS_TITLE)).not.toBeInTheDocument();
    expect(row).toHaveTextContent(/^Sono\s*25 de 100\s*Atenção$/);
  });

  it('is a collapsed button carrying the summary when the service sent answers', () => {
    const row = renderRow({ answers: SLEEP_ANSWERS, delta: -25 });

    const button = within(row).getByRole('button', { name: /^Sono/ });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('type', 'button');
    expect(within(button).getByRole('img', { name: '25 de 100' })).toBeInTheDocument();
    expect(within(button).getByText('Atenção')).toBeInTheDocument();
    expect(within(button).getByText('−25')).toBeInTheDocument();
    expect(within(row).queryByText(ANSWERS_TITLE)).not.toBeInTheDocument();
    expect(within(row).queryByText(SLEEP_QUESTION)).not.toBeInTheDocument();
  });

  it('shows the questions and the raw answers on click, and hides them on a second click', async () => {
    const user = userEvent.setup();
    const row = renderRow({ answers: SLEEP_ANSWERS });

    await user.click(expandButton());

    expect(expandButton()).toHaveAttribute('aria-expanded', 'true');
    expect(within(row).getByText(ANSWERS_TITLE)).toBeInTheDocument();
    expect(within(row).getByText(SLEEP_QUESTION)).toBeInTheDocument();
    expect(within(row).getByRole('img', { name: '2 de 5 estrelas' })).toBeInTheDocument();
    expect(within(row).getByText('2 de 5')).toBeInTheDocument();

    await user.click(expandButton());

    expect(expandButton()).toHaveAttribute('aria-expanded', 'false');
    expect(within(row).queryByText(ANSWERS_TITLE)).not.toBeInTheDocument();
    expect(within(row).queryByText(SLEEP_QUESTION)).not.toBeInTheDocument();
  });

  it('points aria-controls at the block of answers while it is open', async () => {
    const user = userEvent.setup();
    const row = renderRow({ answers: SLEEP_ANSWERS });

    expect(expandButton()).not.toHaveAttribute('aria-controls');
    await user.click(expandButton());

    const controlled = document.getElementById(expandButton().getAttribute('aria-controls'));
    expect(row).toContainElement(controlled);
    expect(within(controlled).getByText(SLEEP_QUESTION)).toBeInTheDocument();
  });

  it('is reached with Tab and toggles with Enter and with Space', async () => {
    const user = userEvent.setup();
    const row = renderRow({ answers: SLEEP_ANSWERS });

    await user.tab();
    expect(expandButton()).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(expandButton()).toHaveAttribute('aria-expanded', 'true');
    expect(within(row).getByText(SLEEP_QUESTION)).toBeInTheDocument();

    await user.keyboard(' ');

    expect(expandButton()).toHaveAttribute('aria-expanded', 'false');
    expect(within(row).queryByText(SLEEP_QUESTION)).not.toBeInTheDocument();
    expect(expandButton()).toHaveFocus();
  });

  it('lists every answer of the pillar, in the order the service sent', async () => {
    const user = userEvent.setup();
    const answers = [
      ...SLEEP_ANSWERS,
      { questionId: 'q-5', question: 'De 0 a 10, quão descansado você acordou?', type: 'score', typeLabel: 'Nota', value: 4, max: 10, inverted: false },
    ];
    const row = renderRow({ answers });

    await user.click(expandButton());

    const items = within(within(row).getByRole('list')).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent(SLEEP_QUESTION);
    expect(items[1]).toHaveTextContent('De 0 a 10, quão descansado você acordou?');
    expect(within(items[1]).getByText('4 de 10')).toBeInTheDocument();
  });

  it('opens each pillar on its own', async () => {
    const user = userEvent.setup();
    render(
      <ul>
        <PillarResultRow pillar={buildPillar({ answers: SLEEP_ANSWERS })} />
        <PillarResultRow pillar={buildPillar({ pillar: 'routine', pillarLabel: 'Rotina', score: 60, band: 'stable', bandLabel: 'Estável', answers: [{ ...SLEEP_ANSWERS[0], questionId: 'q-3', question: 'Sua rotina ajudou?' }] })} />
      </ul>,
    );

    await user.click(screen.getByRole('button', { name: /^Rotina/ }));

    expect(screen.getByRole('button', { name: /^Rotina/ })).toHaveAttribute('aria-expanded', 'true');
    expect(expandButton()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Sua rotina ajudou?')).toBeInTheDocument();
    expect(screen.queryByText(SLEEP_QUESTION)).not.toBeInTheDocument();
  });
});
