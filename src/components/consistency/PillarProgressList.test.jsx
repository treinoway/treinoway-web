import { render, screen, within } from '../../test/test-utils';
import PillarProgressList from './PillarProgressList';

const PILLARS = [
  { pillar: 'workouts', done: 5, expected: 8, adherence: 62.5 },
  { pillar: 'cardio', done: 1, expected: 4, adherence: 25 },
  { pillar: 'feedback', done: 2, expected: 2, adherence: 100 },
  { pillar: 'hydration', done: 7, expected: 14, adherence: 50 },
];

describe('PillarProgressList', () => {
  it('PAN-22 shows the percentage and done of expected of each pillar with a target', () => {
    render(<PillarProgressList pillars={PILLARS} />);

    expect(screen.getByText('Pilares nas semanas fechadas')).toBeInTheDocument();
    const workouts = screen.getByRole('listitem', { name: 'Treinos' });
    expect(within(workouts).getByText('63%')).toBeInTheDocument();
    expect(within(workouts).getByText('· 5 de 8')).toBeInTheDocument();
    const cardio = screen.getByRole('listitem', { name: 'Cardio' });
    expect(within(cardio).getByText('25%')).toBeInTheDocument();
    expect(within(cardio).getByText('· 1 de 4')).toBeInTheDocument();
    const feedback = screen.getByRole('listitem', { name: 'Feedback' });
    expect(within(feedback).getByText('100%')).toBeInTheDocument();
    expect(within(feedback).getByText('· 2 de 2')).toBeInTheDocument();
    const hydration = screen.getByRole('listitem', { name: 'Hidratação' });
    expect(within(hydration).getByText('50%')).toBeInTheDocument();
    expect(within(hydration).getByText('· 7 dias de 14')).toBeInTheDocument();
  });

  it('PAN-22 fills each bar to the adherence and uses the warning color below 70%', () => {
    render(<PillarProgressList pillars={PILLARS} />);

    expect(screen.getByRole('progressbar', { name: 'Treinos' })).toHaveAttribute('aria-valuenow', '63');
    expect(screen.getByRole('progressbar', { name: 'Treinos' })).toHaveClass('score-bar__track--warning');
    expect(screen.getByRole('progressbar', { name: 'Feedback' })).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByRole('progressbar', { name: 'Feedback' })).not.toHaveClass('score-bar__track--warning');
  });

  it('PAN-22 leaves out pillars without a target', () => {
    render(<PillarProgressList pillars={[...PILLARS, { pillar: 'diet', done: 0, expected: 0, adherence: 0 }]} />);
    expect(screen.queryByRole('listitem', { name: 'Dieta' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('shows a note instead of the list when no pillar had a target', () => {
    render(<PillarProgressList pillars={[]} />);
    expect(screen.getByText('Nenhum pilar teve meta nas semanas fechadas.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
