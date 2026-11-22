import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { render, screen, within } from '../../test/test-utils';
import ChallengeCard from './ChallengeCard';

const TODAY = '2026-11-15';

const PREVIEW = [
  { studentId: 's1', firstName: 'Lucas', lastName: 'Ferreira', avatarUrl: null },
  { studentId: 's2', firstName: 'Ana', lastName: 'Costa', avatarUrl: null },
  { studentId: 's3', firstName: 'Paula', lastName: 'Souza', avatarUrl: null },
  { studentId: 's4', firstName: 'João', lastName: 'Martins', avatarUrl: null },
  { studentId: 's5', firstName: 'Rita', lastName: 'Barros', avatarUrl: null },
];

// Championship as GET /trainer/challenges lists it
const challengeOf = (overrides = {}) => ({
  id: 'c1',
  name: 'Verão 2027',
  status: 'active',
  format: 'weeks',
  weeks: 4,
  currentWeek: 2,
  startDate: '2026-11-02',
  endDate: '2026-11-29',
  participantCount: 12,
  participantsPreview: PREVIEW,
  ...overrides,
});

// Detail route stand-in that shows which championship and tab were opened
const OpenedDetail = () => {
  const { id } = useParams();
  const { search } = useLocation();
  return <p>{`Detalhe ${id}${search}`}</p>;
};

// Renders the cards on the list route with the detail route behind them
const renderCards = (challenges) => render(
  <MemoryRouter initialEntries={['/trainer/challenges']}>
    <Routes>
      <Route
        path="/trainer/challenges"
        element={challenges.map((challenge) => <ChallengeCard key={challenge.id} challenge={challenge} today={TODAY} />)}
      />
      <Route path="/trainer/challenges/:id" element={<OpenedDetail />} />
    </Routes>
  </MemoryRouter>,
);

describe('ChallengeCard', () => {
  it('CPD-61 shows dates, progress, up to four avatars with the participant count and Ver ranking', async () => {
    const user = userEvent.setup();
    renderCards([
      challengeOf(),
      challengeOf({ id: 'c2', name: 'Inverno', status: 'scheduled', currentWeek: null, startDate: '2026-12-07', endDate: '2027-01-03', participantCount: 3, participantsPreview: PREVIEW.slice(0, 3) }),
      challengeOf({ id: 'c3', name: 'Outono', status: 'completed', currentWeek: null, startDate: '2026-09-07', endDate: '2026-10-04', participantCount: 4, participantsPreview: PREVIEW.slice(0, 4) }),
    ]);

    const running = screen.getByRole('article', { name: 'Verão 2027' });
    expect(within(running).getByText('Em andamento')).toBeInTheDocument();
    expect(within(running).getByText('02/11 – 29/11/2026')).toBeInTheDocument();
    expect(within(running).getByText('Semana 2 de 4')).toBeInTheDocument();
    expect(within(running).getByText('Progresso')).toBeInTheDocument();
    expect(within(running).getByRole('progressbar', { name: 'Progresso' })).toHaveAttribute('aria-valuenow', '50');
    ['LF', 'AC', 'PS', 'JM'].forEach((initials) => expect(within(running).getByText(initials)).toBeInTheDocument());
    expect(within(running).queryByText('RB')).not.toBeInTheDocument();
    expect(within(running).getByText('12 participantes')).toBeInTheDocument();

    const scheduled = screen.getByRole('article', { name: 'Inverno' });
    expect(within(scheduled).getByText('07/12 – 03/01/2027')).toBeInTheDocument();
    expect(within(scheduled).queryByRole('progressbar')).not.toBeInTheDocument();
    expect(within(scheduled).getByText('3 participantes')).toBeInTheDocument();

    const completed = screen.getByRole('article', { name: 'Outono' });
    expect(within(completed).getByText('Encerrado')).toBeInTheDocument();
    expect(within(completed).getByRole('progressbar', { name: 'Progresso' })).toHaveAttribute('aria-valuenow', '100');

    await user.click(within(running).getByRole('button', { name: 'Ver ranking' }));

    expect(screen.getByText('Detalhe c1?tab=ranking')).toBeInTheDocument();
  });

  it('CPD-63 shows "Nenhum participante — campeonato inativo" with Adicionar alunos', async () => {
    const user = userEvent.setup();
    renderCards([
      challengeOf({ id: 'c9', name: 'Sprint Semanal', status: 'scheduled', currentWeek: null, startDate: '2026-11-16', endDate: '2026-11-22', weeks: 1, participantCount: 0, participantsPreview: [] }),
    ]);

    const card = screen.getByRole('article', { name: 'Sprint Semanal' });
    expect(within(card).getByText('Começa amanhã')).toBeInTheDocument();
    expect(within(card).getByText('Nenhum participante — campeonato inativo')).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: 'Ver ranking' })).not.toBeInTheDocument();
    expect(within(card).queryByText(/participantes$/)).not.toBeInTheDocument();

    await user.click(within(card).getByRole('button', { name: 'Adicionar alunos' }));

    expect(screen.getByText('Detalhe c9?tab=participants')).toBeInTheDocument();
  });
});
