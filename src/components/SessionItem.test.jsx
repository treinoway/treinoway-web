import userEvent from '@testing-library/user-event';
import { render, screen } from '../test/test-utils';
import SessionItem from './SessionItem';

const baseSession = {
  id: 'sess-1',
  trainingName: 'Upper - costas',
  status: 'completed',
  startedAt: '2026-09-21T15:00:00Z',
  durationSeconds: 3300,
  avgRpe: 7.5,
};

// Renders one SessionItem with the given overrides.
const renderItem = (session = {}) => {
  const onOpen = vi.fn();
  const merged = { ...baseSession, ...session };
  render(<ul><SessionItem session={merged} onOpen={onOpen} /></ul>);
  return { onOpen, merged };
};

describe('SessionItem', () => {
  it('renders name, date and meta line', () => {
    renderItem();
    expect(screen.getByRole('button', { name: 'Abrir sessão Upper - costas de 21 set' })).toBeInTheDocument();
    expect(screen.getByText('Upper - costas')).toBeInTheDocument();
    expect(screen.getByText('55 min · RPE 7,5')).toBeInTheDocument();
  });

  it('shows no badge for completed sessions', () => {
    renderItem();
    expect(screen.queryByText('Abandonado')).not.toBeInTheDocument();
    expect(screen.queryByText('Em andamento')).not.toBeInTheDocument();
  });

  it('shows the abandoned badge', () => {
    renderItem({ status: 'abandoned' });
    expect(screen.getByText('Abandonado')).toBeInTheDocument();
  });

  it('shows the in-progress badge', () => {
    renderItem({ status: 'in_progress' });
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
  });

  it('falls back to a generic name when trainingName is missing', () => {
    renderItem({ trainingName: null });
    expect(screen.getByRole('button', { name: /abrir sessão treino de 21 set/i })).toBeInTheDocument();
  });

  it('falls back to dashes when the date is missing or invalid', () => {
    renderItem({ startedAt: null });
    expect(screen.getByRole('button', { name: /de - -$/ })).toBeInTheDocument();
  });

  it('omits the meta line when duration and RPE are absent', () => {
    renderItem({ durationSeconds: null, avgRpe: null });
    expect(screen.queryByText(/min|RPE/)).not.toBeInTheDocument();
  });

  it('shows only RPE when duration is missing', () => {
    renderItem({ durationSeconds: null });
    expect(screen.getByText('RPE 7,5')).toBeInTheDocument();
  });

  it('calls onOpen with the session on click', async () => {
    const user = userEvent.setup();
    const { onOpen, merged } = renderItem();
    await user.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalledWith(merged);
  });

  it('opens with Enter and Space from the keyboard', async () => {
    const user = userEvent.setup();
    const { onOpen } = renderItem();
    await user.tab();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onOpen).toHaveBeenCalledTimes(2);
  });
});
