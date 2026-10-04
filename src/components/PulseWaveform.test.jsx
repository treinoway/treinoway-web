import userEvent from '@testing-library/user-event';
import { renderWithRoute, screen, within } from '../test/test-utils';
import PulseWaveform from './PulseWaveform';

const makeSession = (overrides = {}) => ({
  status: 'completed',
  volumeKg: 2540,
  hasLoad: true,
  pct: 80,
  sessionCount: 1,
  trainingName: null,
  completedSets: 6,
  totalSets: 6,
  ...overrides,
});

/** A September timeline of `length` days with sessions at the given day indices. */
const makeDays = (sessionsByIndex, length = 30) =>
  Array.from({ length }, (_, index) => ({
    date: `2026-09-${String(index + 1).padStart(2, '0')}`,
    session: sessionsByIndex[index] ? makeSession(sessionsByIndex[index]) : null,
  }));

const getPlot = () => screen.getByRole('group', { name: 'Volume por sessão' });
const getBar = (name) => within(getPlot()).getByRole('button', { name });

describe('PulseWaveform', () => {
  it('renders nothing without sessions', () => {
    const { container } = renderWithRoute(<PulseWaveform days={makeDays({})} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('places each session on its calendar day and keeps rest days as empty slots', () => {
    renderWithRoute(<PulseWaveform days={makeDays({ 0: {}, 4: {}, 29: {} }, 30)} />);
    const plot = getPlot();
    expect(plot.children).toHaveLength(30);
    expect(within(plot).getAllByRole('button')).toHaveLength(3);
    expect(within(plot.children[4]).getByRole('button', { name: /5 de set/ })).toBeInTheDocument();
    expect(plot.children[1]).toBeEmptyDOMElement();
  });

  it('labels each bar with date, status and volume', () => {
    renderWithRoute(<PulseWaveform days={makeDays({ 2: { status: 'partial', volumeKg: 1700 } })} />);
    expect(getBar('Qui, 3 de set: Treino parcial, 1.700 kg')).toBeInTheDocument();
  });

  it('encodes the status by shape: solid, light + border, dashed outline with ×', () => {
    renderWithRoute(
      <PulseWaveform days={makeDays({ 0: { status: 'completed' }, 10: { status: 'partial' }, 20: { status: 'abandoned' } })} />,
    );
    const completed = getBar(/Treino completo/);
    const partial = getBar(/Treino parcial/);
    const abandoned = getBar(/Treino abandonado/);
    expect(completed).toHaveClass('volume-chart__slot--full');
    expect(partial).toHaveClass('volume-chart__slot--cut');
    expect(abandoned).toHaveClass('volume-chart__slot--abandoned');
    expect(abandoned.querySelector('svg')).toBeInTheDocument();
    expect(completed.querySelector('svg')).not.toBeInTheDocument();
    expect(partial.querySelector('svg')).not.toBeInTheDocument();
  });

  it('shows direct value labels only on the max and the latest bars', () => {
    renderWithRoute(
      <PulseWaveform days={makeDays({
        1: { volumeKg: 5900 },
        8: { volumeKg: 14784 },
        15: { volumeKg: 4560 },
        28: { volumeKg: 10029 },
      })}
      />,
    );
    expect(within(getPlot()).getByText('14.784')).toBeInTheDocument();
    expect(within(getPlot()).getByText('10.029')).toBeInTheDocument();
    expect(within(getPlot()).queryByText('5.900')).not.toBeInTheDocument();
    expect(within(getPlot()).queryByText('4.560')).not.toBeInTheDocument();
  });

  it('renders a session without load as a low marker with "Sem carga registrada"', async () => {
    const user = userEvent.setup();
    renderWithRoute(<PulseWaveform days={makeDays({ 3: { hasLoad: false, volumeKg: null, pct: 0 } })} />);
    const marker = getBar(/Sem carga registrada/);
    expect(marker).toHaveClass('volume-chart__slot--no-load');

    await user.hover(marker);
    expect(within(screen.getByRole('tooltip')).getByText('Sem carga registrada')).toBeInTheDocument();
  });

  it('renders weekly axis ticks ending on the period end', () => {
    renderWithRoute(<PulseWaveform days={makeDays({ 0: {} }, 30)} />);
    ['2 set', '9 set', '16 set', '23 set', '30 set'].forEach((tick) => {
      expect(screen.getByText(tick)).toBeInTheDocument();
    });
    expect(screen.queryByText('1 set')).not.toBeInTheDocument();
  });

  it('renders the shape legend and the unit', () => {
    renderWithRoute(<PulseWaveform days={makeDays({ 0: {} })} />);
    const legend = screen.getByRole('list', { name: 'Legenda' });
    expect(within(legend).getByText('Treino completo')).toBeInTheDocument();
    expect(within(legend).getByText('Treino parcial')).toBeInTheDocument();
    expect(within(legend).getByText('Treino abandonado')).toBeInTheDocument();
    expect(screen.getByText('volume em kg')).toBeInTheDocument();
  });

  it('includes an accessible data table with date, status, volume and sets', () => {
    renderWithRoute(
      <PulseWaveform days={makeDays({ 2: { volumeKg: 1700, completedSets: 5, totalSets: 6 }, 6: { status: 'abandoned', hasLoad: false, volumeKg: null } })} />,
    );
    const table = screen.getByRole('table', { name: 'Volume por dia de treino' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getByRole('rowheader', { name: 'Qui, 3 de set' })).toBeInTheDocument();
    expect(within(rows[1]).getByText('1.700 kg')).toBeInTheDocument();
    expect(within(rows[1]).getByText('5/6')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Treino abandonado')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Sem carga registrada')).toBeInTheDocument();
  });

  it('opens the tooltip on hover and closes it on mouse leave', async () => {
    const user = userEvent.setup();
    renderWithRoute(<PulseWaveform days={makeDays({ 2: {} })} />);
    const bar = getBar(/3 de set/);

    await user.hover(bar);
    const tooltip = screen.getByRole('tooltip');
    expect(within(tooltip).getByText('6/6')).toBeInTheDocument();
    expect(bar).toHaveAccessibleDescription(/Treino completo/);

    await user.unhover(bar);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('has a single tab stop on the latest session and moves across sessions with arrow keys', async () => {
    const user = userEvent.setup();
    renderWithRoute(<PulseWaveform days={makeDays({ 2: {}, 9: {}, 20: {} })} />);

    await user.tab();
    expect(getBar(/21 de set/)).toHaveFocus();
    expect(within(screen.getByRole('tooltip')).getByText('Seg, 21 de set')).toBeInTheDocument();

    await user.keyboard('{ArrowLeft}');
    expect(getBar(/10 de set/)).toHaveFocus();
    await user.keyboard('{Home}');
    expect(getBar(/3 de set/)).toHaveFocus();
    await user.keyboard('{End}');
    expect(getBar(/21 de set/)).toHaveFocus();

    await user.tab();
    expect(document.body).toHaveFocus();
  });

  it('remembers the last focused session as the tab stop', async () => {
    const user = userEvent.setup();
    renderWithRoute(<PulseWaveform days={makeDays({ 2: {}, 9: {} })} />);
    await user.tab();
    await user.keyboard('{ArrowLeft}');
    await user.tab();
    await user.tab({ shift: true });
    expect(getBar(/3 de set/)).toHaveFocus();
  });

  it('closes the tooltip with Escape and toggles it with Enter', async () => {
    const user = userEvent.setup();
    renderWithRoute(<PulseWaveform days={makeDays({ 2: {} })} />);

    await user.tab();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });
});
