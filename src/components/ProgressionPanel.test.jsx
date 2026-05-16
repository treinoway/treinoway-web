import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import ProgressionPanel from './ProgressionPanel';

vi.mock('./ProgressionRow', () => ({
  default: ({ entry, onOpen }) => (
    <li>
      <button type="button" onClick={onOpen}>{entry.exerciseName}</button>
    </li>
  ),
}));

const makeEntries = (count) =>
  Array.from({ length: count }, (_, i) => ({
    exerciseId: `ex-${i}`,
    exerciseName: `Exercício ${i + 1}`,
    trainingId: 'train-1',
    trainingName: 'Treino A',
    latestWeightKg: 80 + i,
    deltaPercent: 10 + i,
  }));

const defaultProps = {
  entries: makeEntries(3),
  loading: false,
  error: null,
  onRetry: vi.fn(),
  onOpenEntry: vi.fn(),
};

describe('ProgressionPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders section heading', () => {
    renderWithRouter(<ProgressionPanel {...defaultProps} />);
    expect(screen.getByText('Progressão de carga')).toBeInTheDocument();
  });

  it('renders suffix "· vs 1ª sessão"', () => {
    renderWithRouter(<ProgressionPanel {...defaultProps} />);
    expect(screen.getByText(/vs 1ª sessão/i)).toBeInTheDocument();
  });

  it('renders group header with training name', () => {
    renderWithRouter(<ProgressionPanel {...defaultProps} />);
    expect(screen.getByText('Treino A')).toBeInTheDocument();
  });

  it('renders exercise rows inside first group (expanded by default)', () => {
    renderWithRouter(<ProgressionPanel {...defaultProps} />);
    expect(screen.getByText('Exercício 1')).toBeInTheDocument();
  });

  it('calls onOpenEntry when a progression row is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProgressionPanel {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: 'Exercício 1' }));
    expect(defaultProps.onOpenEntry).toHaveBeenCalledTimes(1);
  });

  it('returns null when entries is empty and not loading', () => {
    const { container } = renderWithRouter(
      <ProgressionPanel {...defaultProps} entries={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders skeleton when loading with no entries', () => {
    renderWithRouter(
      <ProgressionPanel {...defaultProps} entries={[]} loading />,
    );
    expect(document.querySelector('.activity-section-skeleton')).toBeInTheDocument();
  });

  it('renders error state and retry button', () => {
    renderWithRouter(
      <ProgressionPanel
        {...defaultProps}
        entries={[]}
        error={new Error('fail')}
      />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <ProgressionPanel
        {...defaultProps}
        entries={[]}
        error={new Error('fail')}
      />,
    );
    await user.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(defaultProps.onRetry).toHaveBeenCalledTimes(1);
  });

  it('toggles a non-first group collapsed/expanded on header click', async () => {
    const user = userEvent.setup();
    // Two groups: Treino A (index 0, always expanded) + Treino B (index 1, starts collapsed)
    const twoGroupEntries = [
      { exerciseId: 'ex-0', exerciseName: 'Exercício 1', trainingId: 'train-1', trainingName: 'Treino A', latestWeightKg: 80, deltaPercent: 10 },
      { exerciseId: 'ex-1', exerciseName: 'Exercício 2', trainingId: 'train-2', trainingName: 'Treino B', latestWeightKg: 60, deltaPercent: 5 },
    ];
    renderWithRouter(<ProgressionPanel {...defaultProps} entries={twoGroupEntries} />);
    // Treino B is collapsed by default — exercise row not visible
    expect(screen.queryByText('Exercício 2')).not.toBeInTheDocument();
    // Click Treino B header to expand
    await user.click(screen.getByRole('button', { name: /treino b/i }));
    expect(screen.getByText('Exercício 2')).toBeInTheDocument();
    // Click again to collapse
    await user.click(screen.getByRole('button', { name: /treino b/i }));
    expect(screen.queryByText('Exercício 2')).not.toBeInTheDocument();
  });

  it('shows "Ver todos" button when entries exceed default visible rows', () => {
    renderWithRouter(
      <ProgressionPanel {...defaultProps} entries={makeEntries(8)} />,
    );
    expect(screen.getByRole('button', { name: /ver todos os 8 exercícios/i })).toBeInTheDocument();
  });

  it('expands all entries when "Ver todos" is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <ProgressionPanel {...defaultProps} entries={makeEntries(8)} />,
    );
    await user.click(screen.getByRole('button', { name: /ver todos os 8 exercícios/i }));
    expect(screen.getByRole('button', { name: /mostrar menos/i })).toBeInTheDocument();
  });
});
