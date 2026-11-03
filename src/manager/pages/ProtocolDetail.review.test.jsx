import { screen, within, render } from '../../test/test-utils';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtocolDetail from './ProtocolDetail';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

// Builds an exercise with defaults.
const exercise = (overrides) => ({
  id: 'e',
  order: 1,
  sets: 3,
  hasLoad: false,
  suggestedLoad: null,
  restInterval: null,
  notes: null,
  ...overrides,
});

const protocol = {
  id: 'p1',
  name: 'Rotina real',
  trainerName: 'Ana',
  assigneeName: 'Maria',
  startDate: '2026-10-01',
  endDate: null,
  trainings: [
    {
      id: 'tr1',
      name: 'Treino A',
      exercises: [
        exercise({ id: 'e1', name: 'Supino', repetitions: { min: 8, max: 12 }, prescriptionMode: 'repetitions' }),
        exercise({ id: 'e2', name: 'Agachamento', repetitions: 10 }),
        exercise({ id: 'e3', name: 'Prancha', repetitions: null, prescriptionMode: 'duration', duration: 45 }),
      ],
    },
  ],
};

// Renders the protocol page at its route.
const renderProtocol = () =>
  render(
    <MemoryRouter initialEntries={['/manager/protocols/p1']}>
      <Routes>
        <Route path="/manager/protocols/:protocolId" element={<ProtocolDetail />} />
      </Routes>
    </MemoryRouter>
  );

describe('ProtocolDetail real exercise shapes', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.get.mockResolvedValue({ data: protocol });
  });

  it('renders {min,max}, plain numbers and durations without [object Object]', async () => {
    const { container } = renderProtocol();

    await screen.findByText('Supino');
    const table = container.querySelector('table.admin-table');
    expect(within(table).getByText('8-12')).toBeInTheDocument();
    expect(within(table).getByText('10')).toBeInTheDocument();
    expect(within(table).getByText('45s')).toBeInTheDocument();
    expect(container.textContent).not.toContain('[object Object]');
  });

  it('wraps each exercise table in admin-table-wrap inside the section-card', async () => {
    const { container } = renderProtocol();

    await screen.findByText('Supino');
    expect(container.querySelector('.section-card .admin-table-wrap table.admin-table')).toBeInTheDocument();
  });
});
