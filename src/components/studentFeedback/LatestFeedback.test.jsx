import { describe, it, expect } from 'vitest';
import { render, screen, within } from '../../test/test-utils';
import LatestFeedback from './LatestFeedback';

const DS = { Badge: 'badge', Meter: 'meter' };

const LEGEND = 'Notas de 0 a 100, calculadas das respostas do aluno. Abaixo de 50 pede atenção; de 50 a 74, estável; 75 ou mais, bom.';
// why: the answer instants are built in local time so the day shown does not depend on the timezone of the machine
const ANSWERED_DAY_15 = new Date(2026, 10, 11, 12, 0).toISOString();
const ANSWERED_DAY_7 = new Date(2026, 10, 3, 12, 0).toISOString();
const BAND_LABEL = { good: 'Bom', stable: 'Estável', attention: 'Atenção' };

// Pillar score with its band, as the trainer API sends it
const pillar = (name, pillarLabel, score, band) => ({ pillar: name, pillarLabel, score, band, bandLabel: BAND_LABEL[band] ?? null, answers: [] });

// Answered feedback with the fields the block reads; overrides replace any of them
const buildFeedback = (overrides = {}) => ({
  id: 'fb-2',
  milestone: 'D15',
  milestoneLabel: 'D15',
  status: 'answered',
  submittedAt: ANSWERED_DAY_15,
  overallIndex: 58,
  band: 'stable',
  bandLabel: 'Estável',
  pillars: [
    pillar('sleep', 'Sono', 25, 'attention'),
    pillar('training_adherence', 'Adesão ao treino', 90, 'good'),
  ],
  ...overrides,
});

const LATEST = buildFeedback();
const PREVIOUS = buildFeedback({
  id: 'fb-1',
  milestone: 'D7',
  milestoneLabel: 'D7',
  submittedAt: ANSWERED_DAY_7,
  overallIndex: 62,
  pillars: [
    pillar('training_adherence', 'Adesão ao treino', 80, 'good'),
    pillar('sleep', 'Sono', 50, 'stable'),
  ],
});

// The block of the latest answered feedback
const block = () => screen.getByRole('region', { name: 'Último feedback respondido' });

// The list of pillars of the block
const pillarList = () => within(block()).getByRole('list', { name: 'Pilares do último feedback' });

// Elements with the given text that sit outside the list of pillars
const outsidePillars = (text) => within(block()).queryAllByText(text).filter((element) => !pillarList().contains(element));

// Meters of the block that sit outside the list of pillars
const overallMeters = () => within(block()).queryAllByRole('img').filter((element) => !pillarList().contains(element));

describe('LatestFeedback: overall index', () => {
  it('is a section named "Último feedback respondido" with a level 2 heading', () => {
    render(<LatestFeedback latest={LATEST} />);

    expect(within(block()).getByRole('heading', { level: 2, name: 'Último feedback respondido' })).toBeInTheDocument();
    expect(within(block()).getByText('Índice geral')).toBeInTheDocument();
  });

  it('shows the index as a value "de 100" with a meter announced with its scale', () => {
    render(<LatestFeedback latest={LATEST} />);

    expect(outsidePillars('58')).toHaveLength(1);
    expect(outsidePillars('de 100')).toHaveLength(1);
    const [meter] = overallMeters();
    expect(meter).toHaveAccessibleName('58 de 100');
    expect(meter).toHaveClass(DS.Meter);
  });

  it.each([
    ['attention', 'Atenção', 'meter--danger', 'badge--error', 30],
    ['stable', 'Estável', 'meter--warning', 'badge--warning', 58],
    ['good', 'Bom', 'meter--success', 'badge--success', 77],
  ])('shows the band %s as the badge "%s" and colors the meter with its tone', (band, bandLabel, meterClass, badgeClass, overallIndex) => {
    render(<LatestFeedback latest={buildFeedback({ overallIndex, band, bandLabel, pillars: [] })} />);

    expect(within(block()).getByText(bandLabel)).toHaveClass(DS.Badge, badgeClass);
    expect(within(block()).getByRole('img', { name: `${overallIndex} de 100` })).toHaveClass(meterClass);
  });

  it('shows no band badge and a neutral meter when the service sent no band', () => {
    render(<LatestFeedback latest={buildFeedback({ band: null, bandLabel: null, pillars: [] })} />);

    expect(within(block()).getByRole('img', { name: '58 de 100' })).toHaveClass('meter--neutral');
    expect(within(block()).queryByText(/^(Bom|Estável|Atenção)$/)).not.toBeInTheDocument();
    expect(block()).not.toHaveTextContent(/null|undefined/);
  });

  it('keeps an index of zero as a value with its meter', () => {
    render(<LatestFeedback latest={buildFeedback({ overallIndex: 0, band: 'attention', bandLabel: 'Atenção', pillars: [] })} />);

    expect(within(block()).getByText('0')).toBeInTheDocument();
    expect(within(block()).getByRole('img', { name: '0 de 100' })).toBeInTheDocument();
    expect(within(block()).queryByText('Sem nota')).not.toBeInTheDocument();
  });

  it('shows the legend of the scale and the bands', () => {
    render(<LatestFeedback latest={LATEST} />);

    expect(within(block()).getByText(LEGEND)).toBeInTheDocument();
  });
});

describe('LatestFeedback: missing overall index', () => {
  it.each([[null], [undefined]])('shows "Sem nota" instead of a number or a meter when the index is %s', (overallIndex) => {
    render(<LatestFeedback latest={buildFeedback({ overallIndex, band: null, bandLabel: null, pillars: [] })} />);

    expect(within(block()).getByText('Sem nota')).toBeInTheDocument();
    expect(within(block()).queryByRole('img')).not.toBeInTheDocument();
    expect(within(block()).queryByText('de 100')).not.toBeInTheDocument();
    expect(block()).not.toHaveTextContent(/null|undefined|NaN/);
  });

  it('shows no variation against a previous feedback when the latest has no index', () => {
    render(<LatestFeedback latest={buildFeedback({ overallIndex: null, band: null, bandLabel: null, pillars: [] })} previous={PREVIOUS} />);

    expect(within(block()).getByText('Sem nota')).toBeInTheDocument();
    expect(within(block()).queryByText(/^desde /)).not.toBeInTheDocument();
    expect(block()).not.toHaveTextContent(/NaN/);
  });

  it('still shows the legend', () => {
    render(<LatestFeedback latest={buildFeedback({ overallIndex: null, band: null, bandLabel: null, pillars: [] })} />);

    expect(within(block()).getByText(LEGEND)).toBeInTheDocument();
  });
});

describe('LatestFeedback: variation against the previous answered feedback', () => {
  it('shows no variation and names only its own send when there is no previous one', () => {
    render(<LatestFeedback latest={LATEST} />);

    expect(within(block()).getByText(/^15 dias · respondido em 11\/11(\/2026)?$/)).toBeInTheDocument();
    expect(within(block()).queryByText(/^desde /)).not.toBeInTheDocument();
    expect(block()).not.toHaveTextContent('comparado com');
    expect(within(block()).queryByText(/^[+−]\d+$/)).not.toBeInTheDocument();
  });

  it('shows the same when `previous` is null', () => {
    render(<LatestFeedback latest={LATEST} previous={null} />);

    expect(within(block()).queryByText(/^desde /)).not.toBeInTheDocument();
    expect(block()).not.toHaveTextContent('comparado com');
  });

  it('says which send it is compared with', () => {
    render(<LatestFeedback latest={LATEST} previous={PREVIOUS} />);

    expect(within(block()).getByText(/^15 dias · respondido em 11\/11(\/2026)? · comparado com 7 dias$/)).toBeInTheDocument();
  });

  it('shows a loss of the index with the typographic minus in an error badge, since the previous send', () => {
    render(<LatestFeedback latest={LATEST} previous={PREVIOUS} />);

    const [delta] = outsidePillars('−4');
    expect(delta).toHaveClass(DS.Badge, 'badge--error');
    expect(delta.parentElement).toHaveTextContent('−4 desde 7 dias');
  });

  it('shows a gain of the index with a plus sign in a success badge', () => {
    render(<LatestFeedback latest={buildFeedback({ overallIndex: 80, band: 'good', bandLabel: 'Bom', pillars: [] })} previous={PREVIOUS} />);

    expect(within(block()).getByText('+18')).toHaveClass(DS.Badge, 'badge--success');
    expect(within(block()).getByText('+18').parentElement).toHaveTextContent('+18 desde 7 dias');
  });

  it('shows an unchanged index as "0" in a neutral badge', () => {
    render(<LatestFeedback latest={buildFeedback({ overallIndex: 62, pillars: [] })} previous={PREVIOUS} />);

    expect(within(block()).getByText('0')).toHaveClass(DS.Badge, 'badge--neutral');
  });

  it('shows no variation when the previous feedback has no index', () => {
    render(<LatestFeedback latest={buildFeedback({ pillars: [] })} previous={buildFeedback({ id: 'fb-1', milestone: 'D7', overallIndex: null, pillars: [] })} />);

    expect(within(block()).queryByText(/^desde /)).not.toBeInTheDocument();
    expect(block()).not.toHaveTextContent(/NaN/);
    expect(within(block()).getByText('58')).toBeInTheDocument();
  });
});

describe('LatestFeedback: pillars', () => {
  it('lists the pillars in the fixed display order, whatever order the service sent', () => {
    render(<LatestFeedback latest={LATEST} />);

    const rows = within(pillarList()).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(/^Adesão ao treino/);
    expect(rows[1]).toHaveTextContent(/^Sono/);
  });

  it('shows each pillar with its value, meter and band', () => {
    render(<LatestFeedback latest={LATEST} />);

    const [training, sleep] = within(pillarList()).getAllByRole('listitem');
    expect(within(training).getByRole('img', { name: '90 de 100' })).toHaveClass(DS.Meter, 'meter--success');
    expect(within(training).getByText('Bom')).toHaveClass(DS.Badge, 'badge--success');
    expect(within(sleep).getByRole('img', { name: '25 de 100' })).toHaveClass(DS.Meter, 'meter--danger');
    expect(within(sleep).getByText('Atenção')).toHaveClass(DS.Badge, 'badge--error');
  });

  it('shows the variation of each pillar against the same pillar of the previous feedback', () => {
    render(<LatestFeedback latest={LATEST} previous={PREVIOUS} />);

    const [training, sleep] = within(pillarList()).getAllByRole('listitem');
    expect(within(training).getByText('+10')).toHaveClass(DS.Badge, 'badge--success');
    expect(within(sleep).getByText('−25')).toHaveClass(DS.Badge, 'badge--error');
  });

  it('shows no variation on the pillars without a previous feedback', () => {
    render(<LatestFeedback latest={LATEST} />);

    expect(within(pillarList()).queryByText(/^[+−]\d+$/)).not.toBeInTheDocument();
  });

  it('shows "Sem nota" on a pillar the service sent without a score, next to the scored ones', () => {
    const latest = buildFeedback({ pillars: [pillar('sleep', 'Sono', null, null), pillar('training_adherence', 'Adesão ao treino', 90, 'good')] });
    render(<LatestFeedback latest={latest} previous={PREVIOUS} />);

    const [training, sleep] = within(pillarList()).getAllByRole('listitem');
    expect(within(sleep).getByText('Sem nota')).toBeInTheDocument();
    expect(within(sleep).queryByRole('img')).not.toBeInTheDocument();
    expect(sleep).not.toHaveTextContent(/null|undefined|NaN|de 100/);
    expect(within(training).getByRole('img', { name: '90 de 100' })).toBeInTheDocument();
  });

  it('shows an empty list for a feedback without pillars', () => {
    render(<LatestFeedback latest={buildFeedback({ pillars: [] })} />);

    expect(within(pillarList()).queryAllByRole('listitem')).toHaveLength(0);
  });
});
