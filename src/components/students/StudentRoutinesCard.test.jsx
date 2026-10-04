import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import StudentRoutinesCard from './StudentRoutinesCard';

const protocols = [
  { id: 'p1', name: 'Protocolo 03', status: 'active', startDate: '2026-08-06', expirationDate: '2026-10-13' },
  { id: 'p2', name: 'Protocolo 02', status: 'completed', startDate: '2026-05-01', expirationDate: '2026-08-01' },
  { id: 'p3', name: 'Protocolo 01', status: 'archived', startDate: '2026-01-01', expirationDate: '2026-04-01' },
  { id: 'p4', name: 'Protocolo 00', status: 'archived', startDate: '2025-09-01', expirationDate: '2025-12-01' },
];

const renderCard = (props = {}) => {
  const handlers = { onOpen: vi.fn(), onCreate: vi.fn(), onViewAll: vi.fn() };
  render(<StudentRoutinesCard protocols={protocols} loading={false} {...handlers} {...props} />);
  return handlers;
};

describe('StudentRoutinesCard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-04T12:00:00'));
  });

  afterEach(() => vi.useRealTimers());

  it('lists the current routines with status, dates and expiry', () => {
    renderCard();
    expect(screen.getByRole('heading', { name: 'Rotinas' })).toBeInTheDocument();
    expect(screen.getByText('Protocolo 03')).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
    expect(screen.getByText(/06\/08\/2026 – 13\/10\/2026/)).toBeInTheDocument();
    expect(screen.getByText('· vence em 9 dias')).toBeInTheDocument();
    expect(screen.getByText('Protocolo 02')).toBeInTheDocument();
  });

  it('summarizes archived routines instead of listing them', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { onViewAll } = renderCard();
    expect(screen.queryByText('Protocolo 01')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '2 rotinas arquivadas' }));
    expect(onViewAll).toHaveBeenCalledTimes(1);
  });

  it('opens a routine', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { onOpen } = renderCard();
    await user.click(screen.getByRole('button', { name: 'Abrir rotina Protocolo 03' }));
    expect(onOpen).toHaveBeenCalledWith(protocols[0]);
  });

  it('creates a routine and opens the full list from the header', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { onCreate, onViewAll } = renderCard();
    await user.click(screen.getByRole('button', { name: 'Nova rotina' }));
    await user.click(screen.getByRole('button', { name: 'Ver todas as rotinas' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onViewAll).toHaveBeenCalledTimes(1);
  });

  it('shows archived routines when there is nothing else', () => {
    renderCard({ protocols: [protocols[2]] });
    expect(screen.getByText('Protocolo 01')).toBeInTheDocument();
    expect(screen.getByText('Arquivado')).toBeInTheDocument();
  });

  it('shows the empty state with a single create action', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { onCreate } = renderCard({ protocols: [] });
    expect(screen.getByText('Sem rotinas ainda')).toBeInTheDocument();
    const createButtons = screen.getAllByRole('button', { name: 'Nova rotina' });
    expect(createButtons).toHaveLength(1);
    await user.click(createButtons[0]);
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('hides content while loading', () => {
    renderCard({ protocols: [], loading: true });
    expect(screen.queryByText('Sem rotinas ainda')).not.toBeInTheDocument();
  });
});
