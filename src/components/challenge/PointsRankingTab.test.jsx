import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, within, waitFor } from '../../test/test-utils';
import PointsRankingTab from './PointsRankingTab';

// Trainer ranking entry as GET /trainer/challenges/:id/ranking returns it
const entry = (position, firstName, lastName, overrides = {}) => ({
  position,
  studentId: `s${position}`,
  firstName,
  lastName,
  avatarUrl: null,
  points: 0,
  workouts: 0,
  bonusPoints: 0,
  pointsThisWeek: 0,
  streakDays: 0,
  ...overrides,
});

const ENTRIES = [
  entry(1, 'Juliana', 'Mendes', { points: 486, workouts: 22, bonusPoints: 50, pointsThisWeek: 40, streakDays: 18 }),
  entry(2, 'Pedro', 'Santos', { points: 412, workouts: 20, bonusPoints: 25, pointsThisWeek: 10, streakDays: 12 }),
  entry(3, 'Lucas', 'Ferreira', { points: 355, workouts: 18, pointsThisWeek: 5, streakDays: 9 }),
  entry(4, 'Camila', 'Rocha', { points: 74, workouts: 5 }),
];

// Holds the selection mode as the page does and renders the tab
const Harness = (props) => {
  const [selecting, setSelecting] = useState(false);
  return <PointsRankingTab entries={ENTRIES} startDate="2026-09-01" selecting={selecting} onSelectingChange={setSelecting} {...props} />;
};

// Renders the tab with spies for every action
const renderTab = (props = {}) => {
  const handlers = { onBonus: vi.fn(), onRemove: vi.fn(), onAwardBulk: vi.fn().mockResolvedValue(true), onAddParticipants: vi.fn() };
  const view = render(<Harness {...handlers} {...props} />);
  return { ...handlers, ...view };
};

// Metric card by its label
const card = (label) => screen.getByText(label).closest('.metric-card');

// Body rows of the XP table
const bodyRows = () => within(screen.getByRole('region', { name: 'Classificação por pontos' })).getAllByRole('row').slice(1);

describe('PointsRankingTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('CPD-38 shows the XP cards and the classification with workouts, streak and points, with the podium only when asked', async () => {
    const user = userEvent.setup();
    const { rerender, onBonus, onRemove } = renderTab();

    expect(within(card('Participantes')).getByText('4')).toBeInTheDocument();
    expect(within(card('Participantes')).getByText('3 pontuaram esta semana')).toBeInTheDocument();
    expect(within(card('Pontos do líder')).getByText('486 pts')).toBeInTheDocument();
    expect(within(card('Pontos do líder')).getByText('74 à frente do 2º lugar')).toBeInTheDocument();
    expect(within(card('Treinos concluídos')).getByText('65')).toBeInTheDocument();
    expect(within(card('Treinos concluídos')).getByText('desde 01/09')).toBeInTheDocument();
    expect(within(card('Bônus concedidos')).getByText('75 pts')).toBeInTheDocument();
    expect(within(card('Bônus concedidos')).getByText('para 2 alunos')).toBeInTheDocument();

    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Posição', 'Aluno', 'Treinos', 'Sequência', 'Pontos', 'Ações']);
    expect(within(bodyRows()[0]).getAllByRole('cell').slice(0, 5).map((cell) => cell.textContent)).toEqual(['1º', expect.stringContaining('Juliana Mendes'), '22', '18 dias', '486 pts']);
    expect(within(bodyRows()[3]).getAllByRole('cell')[3]).toHaveTextContent('—');
    expect(screen.getByText('Mostrando 4 de 4 participantes')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Pódio' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ações para Pedro Santos' }));
    await user.click(screen.getByRole('button', { name: 'Dar bônus' }));
    expect(onBonus).toHaveBeenCalledWith(expect.objectContaining({ studentId: 's2' }));
    await user.click(screen.getByRole('button', { name: 'Ações para Lucas Ferreira' }));
    await user.click(screen.getByRole('button', { name: 'Remover do campeonato' }));
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ studentId: 's3' }));

    rerender(<Harness onBonus={vi.fn()} onRemove={vi.fn()} onAwardBulk={vi.fn()} showPodium />);
    const places = within(screen.getByRole('list', { name: 'Pódio' })).getAllByRole('listitem');
    expect(places.map((place) => place.getAttribute('aria-label'))).toEqual(['2º lugar', '1º lugar', '3º lugar']);
    expect(within(places[1]).getByText('486 pts')).toBeInTheDocument();
    expect(within(places[1]).getByText('22 treinos · sequência de 18 dias')).toBeInTheDocument();
    expect(screen.getByText('Desempate: quem chegou primeiro à pontuação')).toBeInTheDocument();
  });

  it('CPD-38 filters the XP classification by name', async () => {
    const user = userEvent.setup();
    renderTab();

    await user.type(screen.getByRole('searchbox', { name: 'Buscar aluno' }), 'lucas');

    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByText('Mostrando 1 de 4 participantes')).toBeInTheDocument();
  });

  it('CPD-39 selects students and gives a bonus from the bulk bar', async () => {
    const user = userEvent.setup();
    const { onAwardBulk } = renderTab();

    await user.click(screen.getByRole('button', { name: 'Seleção em massa' }));

    expect(screen.getByRole('heading', { name: 'Selecione quem recebe o bônus' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar seleção' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Seleção', 'Posição', 'Aluno', 'Treinos', 'Bônus', 'Pontos']);
    expect(within(bodyRows()[0]).getByText('+50')).toBeInTheDocument();
    expect(within(bodyRows()[2]).getAllByRole('cell')[4]).toHaveTextContent('—');
    expect(screen.queryByRole('button', { name: /Ações para/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Selecionar Juliana Mendes' }));
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar Lucas Ferreira' }));
    const bar = screen.getByRole('toolbar', { name: 'Bônus em massa' });
    expect(within(bar).getByText('2 selecionados')).toBeInTheDocument();

    await user.click(within(bar).getByRole('button', { name: 'Dar bônus' }));
    const sheet = screen.getByRole('dialog', { name: 'Dar bônus para 2 alunos' });
    await user.click(within(sheet).getByRole('button', { name: 'Conceder 25 pontos' }));

    expect(onAwardBulk).toHaveBeenCalledWith(['s1', 's3'], 25, undefined);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Dar bônus para 2 alunos' })).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Todos os participantes' })).toBeInTheDocument();
    expect(screen.queryByRole('toolbar', { name: 'Bônus em massa' })).not.toBeInTheDocument();
  });

  it('CPD-39 keeps the selection when the bulk bonus fails and leaves it with Cancelar', async () => {
    const user = userEvent.setup();
    renderTab({ onAwardBulk: vi.fn().mockResolvedValue(false) });

    await user.click(screen.getByRole('button', { name: 'Seleção em massa' }));
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar Pedro Santos' }));
    const bar = screen.getByRole('toolbar', { name: 'Bônus em massa' });
    expect(within(bar).getByText('1 selecionado')).toBeInTheDocument();
    await user.click(within(bar).getByRole('button', { name: 'Dar bônus' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Dar bônus para 1 aluno' })).getByRole('button', { name: 'Conceder 10 pontos' }));

    expect(screen.getByRole('checkbox', { name: 'Selecionar Pedro Santos' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    await user.click(within(bar).getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('heading', { name: 'Todos os participantes' })).toBeInTheDocument();
  });

  it('shows the closed classification read-only, without selection nor menus', () => {
    renderTab({ readOnly: true, closed: true });

    expect(screen.getByText('Classificação final')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Seleção em massa' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ações para/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox', { name: 'Buscar aluno' })).not.toBeInTheDocument();
  });

  it('CPD-47 shows the empty block with Adicionar participantes when nobody scores yet', async () => {
    const user = userEvent.setup();
    const { onAddParticipants } = renderTab({ entries: [] });

    expect(screen.getByRole('heading', { name: 'Nenhum aluno no ranking ainda.' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Adicionar participantes' }));
    expect(onAddParticipants).toHaveBeenCalledTimes(1);
  });

  it('shows the skeleton while the ranking loads', () => {
    renderTab({ loading: true });

    expect(screen.getByRole('status', { name: 'Carregando ranking' })).toBeInTheDocument();
  });
});
