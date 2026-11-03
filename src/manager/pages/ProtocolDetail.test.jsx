import { screen, waitFor, within, render } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtocolDetail from './ProtocolDetail';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const protocol = {
  id: 'p1',
  name: 'Hipertrofia A',
  trainerName: 'Ana Silva',
  assigneeName: 'Maria Aluna',
  startDate: '2026-10-01',
  endDate: '2026-11-01',
  trainings: [
    {
      id: 'tr1',
      name: 'Treino A - Peito',
      exercises: [
        {
          id: 'e1',
          name: 'Supino reto',
          order: 1,
          sets: 4,
          repetitions: [10, 10, 8, 8],
          hasLoad: true,
          suggestedLoad: 40,
          restInterval: 90,
          notes: 'Controle a descida',
        },
        {
          id: 'e2',
          name: 'Crucifixo',
          order: 2,
          sets: 3,
          repetitions: [12, 12, 12],
          hasLoad: true,
          suggestedLoad: 12,
          restInterval: 60,
          notes: null,
        },
      ],
    },
    {
      id: 'tr2',
      name: 'Treino B - Costas',
      exercises: [
        {
          id: 'e3',
          name: 'Remada curvada',
          order: 1,
          sets: 4,
          repetitions: null,
          hasLoad: false,
          suggestedLoad: null,
          restInterval: null,
          notes: null,
        },
      ],
    },
  ],
};

// Renders the page with a probe route for back navigation.
const renderProtocol = () =>
  render(
    <MemoryRouter initialEntries={['/manager/protocols/p1']}>
      <Routes>
        <Route path="/manager" element={<div>Users list route</div>} />
        <Route path="/manager/users/:userId" element={<div>User route</div>} />
        <Route path="/manager/protocols/:protocolId" element={<ProtocolDetail />} />
      </Routes>
    </MemoryRouter>
  );

describe('ProtocolDetail', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.get.mockResolvedValue({ data: protocol });
  });

  it('fetches /admin/manager/protocols/:id', async () => {
    renderProtocol();

    await waitFor(() => expect(api.get.mock.calls[0][0]).toBe('/admin/manager/protocols/p1'));
  });

  it('renders the protocol header with name, trainer and assignee', async () => {
    renderProtocol();

    expect(await screen.findByRole('heading', { name: /Hipertrofia A/ })).toBeInTheDocument();
    expect(screen.getByText(/Ana Silva/)).toBeInTheDocument();
    expect(screen.getByText(/Maria Aluna/)).toBeInTheDocument();
  });

  it('renders one section-card per training with its name', async () => {
    const { container } = renderProtocol();

    await screen.findByText('Treino A - Peito');
    const cards = container.querySelectorAll('.section-card');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText('Treino A - Peito')).toBeInTheDocument();
    expect(within(cards[1]).getByText('Treino B - Costas')).toBeInTheDocument();
  });

  it('lists each training exercises read-only in an admin-table', async () => {
    const { container } = renderProtocol();

    await screen.findByText('Supino reto');
    const cards = container.querySelectorAll('.section-card');
    const table = cards[0].querySelector('table.admin-table');
    expect(table).toBeInTheDocument();
    expect(within(table).getByText('Supino reto')).toBeInTheDocument();
    expect(within(table).getByText('Crucifixo')).toBeInTheDocument();
    expect(within(table).getByText('10/10/8/8')).toBeInTheDocument();
    expect(within(table).getByText('12/12/12')).toBeInTheDocument();
    expect(within(table).getByText('40 kg')).toBeInTheDocument();
    expect(within(table).getByText('12 kg')).toBeInTheDocument();
    expect(within(table).getByText('90s')).toBeInTheDocument();
    expect(within(table).getByText('60s')).toBeInTheDocument();
    expect(within(table).getByText('Controle a descida')).toBeInTheDocument();
    expect(cards[1].querySelector('table.admin-table')).toBeInTheDocument();
    expect(within(cards[1]).getByText('Remada curvada')).toBeInTheDocument();
    expect(within(cards[1]).getAllByText('—').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('has a ghost back button that goes back in history', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter initialEntries={['/manager/users/u1', '/manager/protocols/p1']} initialIndex={1}>
        <Routes>
          <Route path="/manager/users/:userId" element={<div>User route</div>} />
          <Route path="/manager/protocols/:protocolId" element={<ProtocolDetail />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('Treino A - Peito');
    const back = container.querySelector('.btn.btn--ghost');
    expect(back).toBeInTheDocument();

    await user.click(back);

    expect(await screen.findByText('User route')).toBeInTheDocument();
  });

  it('shows SkeletonRows while loading', () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    const { container } = renderProtocol();

    expect(container.querySelector('.skeleton-rows')).toBeInTheDocument();
  });

  it('shows error.userMessage when the request fails', async () => {
    api.get.mockRejectedValue({ userMessage: 'Rotina não encontrada' });

    renderProtocol();

    expect(await screen.findByText('Rotina não encontrada')).toBeInTheDocument();
  });
});
