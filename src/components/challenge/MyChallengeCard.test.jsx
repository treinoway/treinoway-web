import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, renderWithRoute, screen, within } from '../../test/test-utils';
import MyChallengeCard from './MyChallengeCard';

const TODAY = '2026-11-24';

const weeklyChallenge = {
  id: '6f1c1f5e-1111-4a5b-9c1d-000000000001',
  trainerId: '6f1c1f5e-2222-4a5b-9c1d-000000000002',
  name: 'Verão 2027',
  startDate: '2026-11-02',
  endDate: '2026-12-20',
  status: 'active',
  statusLabel: 'Ativo',
  participantMode: 'all',
  participantCount: 18,
  format: 'weeks',
  weeks: 7,
  currentWeek: 4,
  visibility: 'full',
  anonymousRanking: false,
  consistency: { visibility: 'full', position: 8, total: 18, faixa: 'constant', average: 92.6 },
};

const datesChallenge = {
  id: '6f1c1f5e-1111-4a5b-9c1d-000000000003',
  trainerId: '6f1c1f5e-2222-4a5b-9c1d-000000000002',
  name: 'Campeonato do Mês — Agosto',
  startDate: '2026-08-01',
  endDate: '2026-08-31',
  status: 'completed',
  statusLabel: 'Concluído',
  participantMode: 'all',
  participantCount: 6,
  format: 'dates',
  weeks: null,
  currentWeek: null,
  consistency: null,
};

// Renders the card on a list route that also answers the detail route it links to
const renderCard = (props) => renderWithRoute(
  <MyChallengeCard today={TODAY} {...props} />,
  { route: '/my/challenges', path: '/my/challenges' },
);

// The figure (label and value) of a card by its label
const figureValue = (card, label) => within(card).getByText(label).nextElementSibling;

describe('MyChallengeCard', () => {
  it('APP-71 shows trainer, dates, tag, position and average of a weekly championship', () => {
    renderCard({ challenge: weeklyChallenge, trainerName: 'Gabriel Araújo' });

    const card = screen.getByRole('article', { name: 'Verão 2027' });
    expect(within(card).getByText('Treinador: Gabriel Araújo · 02/11 – 20/12/2026')).toBeInTheDocument();
    const tag = within(card).getByText('Em andamento');
    expect(tag).toHaveClass('badge', 'badge--tag', 'badge--brand');
    expect(figureValue(card, 'Sua posição')).toHaveTextContent('8º');
    expect(figureValue(card, 'Sua média')).toHaveTextContent('93%');
    expect(within(card).queryByText('Seus pontos')).not.toBeInTheDocument();
    expect(within(card).getByRole('button', { name: /Ver ranking/ })).toBeInTheDocument();
  });

  it('APP-71 shows the position and points of a dates championship and opens its ranking', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/my/challenges']}>
        <Routes>
          <Route path="/my/challenges" element={<MyChallengeCard today={TODAY} challenge={datesChallenge} trainerName="Gabriel Araújo" xp={{ position: 2, points: 498 }} />} />
          <Route path="/my/challenges/:id" element={<h1>Detalhe do campeonato</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    const card = screen.getByRole('article', { name: 'Campeonato do Mês — Agosto' });
    expect(within(card).getByText('Treinador: Gabriel Araújo · 01/08 – 31/08/2026')).toBeInTheDocument();
    expect(within(card).getByText('Encerrado')).toHaveClass('badge--success');
    expect(figureValue(card, 'Sua posição')).toHaveTextContent('2º');
    expect(figureValue(card, 'Seus pontos')).toHaveTextContent('498 pts');

    await user.click(within(card).getByRole('button', { name: /Ver ranking/ }));
    expect(screen.getByRole('heading', { name: 'Detalhe do campeonato' })).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('APP-71 shows a dash while the position of a weekly championship is hidden', () => {
    renderCard({ challenge: { ...weeklyChallenge, consistency: { visibility: 'off', position: null, total: null, faixa: null, average: 92.6 } } });

    const card = screen.getByRole('article', { name: 'Verão 2027' });
    expect(within(card).getByText('02/11 – 20/12/2026')).toBeInTheDocument();
    expect(figureValue(card, 'Sua posição')).toHaveTextContent('—');
  });
});
