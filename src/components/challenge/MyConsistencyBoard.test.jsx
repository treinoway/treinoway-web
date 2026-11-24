import { render, screen, within } from '../../test/test-utils';
import MyConsistencyBoard from './MyConsistencyBoard';

// Peer row as GET /my/challenges/:id/consistency returns it
const peer = (key, displayName, position, average, faixa, extra = {}) => ({
  key, displayName, initials: displayName.slice(0, 2).toUpperCase(), avatarUrl: null, position, average, faixa, streak: 1, isMe: false, ...extra,
});

const me = peer('k4', 'Camila R.', 4, 88.4, 'constant', { isMe: true });

const classified = [
  peer('k1', 'Ana B.', 1, 100, 'full'),
  peer('k2', 'Bruno S.', 2, 96.5, 'constant'),
  peer('k3', 'Aluno do time', 2, 96.5, 'constant'),
  me,
  peer('k5', 'Eduarda L.', 5, 71.2, 'steady'),
];

const boardResponse = {
  challenge: {
    id: '6f1c1f5e-1111-4a5b-9c1d-000000000001', name: 'Verão 2027', description: null, status: 'active', statusLabel: 'Ativo',
    startDate: '2026-11-02', endDate: '2026-11-29', weeks: 4, currentWeek: 3, participantCount: 6, closedAt: null,
  },
  visibility: 'full',
  closesAt: '2026-11-30T00:00:00.000Z',
  me: {
    appearsAs: 'Camila R.', position: 4, total: 5, faixa: 'constant', average: 88.4, weeks100: { done: 1, of: 2 }, streak: 1,
    entering: null, firstPlaceShared: null, week: null, weekStrip: [], effectiveWeights: [],
  },
  board: {
    podium: [
      { ...classified[0], shared: false },
      { ...classified[1], shared: true },
      { ...classified[2], shared: true },
    ],
    club100: null,
    tieSentence: 'Mesma média, mesmas semanas a 100% e mesma sequência.',
    neighbors: classified.slice(1),
    entering: [peer('k6', 'Thiago P.', null, 75, 'entering', { validWeeks: 1, required: 2, weeksMissing: 1 })],
    total: 5,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    items: classified,
  },
  privacy: { appearAs: 'name', termVersion: '2026-11-v1', acceptedAt: '2026-11-10T12:00:00.000Z' },
};

// Text of each cell of a ranking row
const rowTexts = (row) => Array.from(row.children).map((cell) => cell.textContent);

describe('MyConsistencyBoard', () => {
  it('APP-66 shows the podium, the Você row, classified and entering with band and percent', () => {
    render(<MyConsistencyBoard data={boardResponse} />);

    const podium = screen.getByRole('list', { name: 'Pódio' });
    const first = within(podium).getByRole('listitem', { name: '1º lugar' });
    expect(within(first).getByText('Ana B.')).toBeInTheDocument();
    expect(within(first).getByText('100%', { selector: '.championship-podium__score' })).toBeInTheDocument();
    const seconds = within(podium).getAllByRole('listitem', { name: '2º lugar' });
    expect(seconds.map((place) => within(place).getByText(/dividido/).textContent)).toEqual(['Constante · 2º dividido', 'Constante · 2º dividido']);
    expect(screen.getByText('Mesma média, mesmas semanas a 100% e mesma sequência.')).toBeInTheDocument();

    const ranking = screen.getByRole('region', { name: 'Ranking' });
    const rows = within(ranking).getAllByRole('listitem');
    expect(rows.map(rowTexts)).toEqual([
      ['1º', 'Ana B.', '100%', '100%'],
      ['2º', 'Bruno S.', 'Constante', '97%'],
      ['2º', 'Aluno do time', 'Constante', '97%'],
      ['4º', 'Você', 'Constante', '88%'],
      ['5º', 'Eduarda L.', 'Em ritmo', '71%'],
    ]);
    expect(rows[3]).toHaveAttribute('aria-current', 'true');
    expect(rows[3]).toHaveClass('my-ranking-row--me');
    expect(within(ranking).queryByText('Camila R.')).not.toBeInTheDocument();
    expect(within(rows[1]).getByText('Constante')).toHaveClass('badge', 'badge--tag');

    const entering = screen.getByRole('region', { name: 'Entrando no campeonato' });
    const [enteringRow] = within(entering).getAllByRole('listitem');
    expect(within(enteringRow).getByText('Thiago P.')).toBeInTheDocument();
    expect(within(enteringRow).getByText('1 de 2 semanas para disputar o pódio')).toBeInTheDocument();
    expect(within(enteringRow).getByText('Entrando')).toHaveClass('badge--tag');
    expect(within(enteringRow).getByText('75%')).toBeInTheDocument();
  });

  it('APP-66 shows Clube 100% as stacked avatars and lists its members once in the Ranking', () => {
    const atFull = [
      { ...me, position: 1, average: 100, faixa: 'full' },
      ...['k1', 'k2', 'k3', 'k5', 'k7', 'k8'].map((key) => peer(key, 'Aluno do time', 2, 100, 'full')),
    ];
    const board = { ...boardResponse.board, podium: null, club100: { total: atFull.length, members: atFull }, tieSentence: null, items: atFull, neighbors: atFull.slice(0, 3) };
    const { container } = render(<MyConsistencyBoard data={{ ...boardResponse, board }} />);

    const club = screen.getByRole('region', { name: 'Clube 100%' });
    expect(within(club).getByText('7 participantes com média 100%')).toBeInTheDocument();
    expect(within(club).queryAllByRole('listitem')).toHaveLength(0);
    const stack = club.querySelector('.my-ranking-club__avatars');
    expect(Array.from(stack.querySelectorAll('.avatar')).map((avatar) => avatar.textContent)).toEqual(['CR', 'AT', 'AT', 'AT', 'AT', '+2']);
    expect(screen.queryByRole('list', { name: 'Pódio' })).not.toBeInTheDocument();

    const rows = within(screen.getByRole('region', { name: 'Ranking' })).getAllByRole('listitem');
    expect(rows).toHaveLength(7);
    expect(rowTexts(rows[0])).toEqual(['1º', 'Você', '100%', '100%']);
    expect(container.querySelectorAll('.my-ranking-row--me')).toHaveLength(1);
  });

  it('APP-66 keeps the Você row when the student is past the loaded page', () => {
    const items = classified.filter((row) => !row.isMe);
    render(<MyConsistencyBoard data={{ ...boardResponse, board: { ...boardResponse.board, items } }} />);

    const rows = within(screen.getByRole('region', { name: 'Ranking' })).getAllByRole('listitem');
    expect(rowTexts(rows[rows.length - 1])).toEqual(['4º', 'Você', 'Constante', '88%']);
  });

  it('APP-66 shows only the student position with visibility position', () => {
    render(<MyConsistencyBoard data={{ ...boardResponse, visibility: 'position', board: null }} />);

    expect(screen.getByText('Você está em 4º de 5')).toBeInTheDocument();
    expect(screen.getByText('Constante')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Ranking' })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Pódio' })).not.toBeInTheDocument();
  });

  it('APP-66 shows no position nor list with visibility off', () => {
    render(<MyConsistencyBoard data={{ ...boardResponse, visibility: 'off', board: null, me: { ...boardResponse.me, position: null, total: null } }} />);

    expect(screen.getByRole('heading', { name: 'O ranking deste campeonato está desligado.' })).toBeInTheDocument();
    expect(screen.queryByText(/4º/)).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Ranking' })).not.toBeInTheDocument();
  });
});
