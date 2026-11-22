import { render, screen } from '../../test/test-utils';
import PillarMini from './PillarMini';

const PILLARS = [
  { pillar: 'workouts', done: 4, expected: 4, adherence: 100 },
  { pillar: 'cardio', done: 1, expected: 3, adherence: 33.3333 },
  { pillar: 'feedback', done: 7, expected: 8, adherence: 87.5 },
];

describe('PillarMini', () => {
  it('CPD-72 draws a labeled bar for each pillar with a target, abbreviated with only the first letter uppercase', () => {
    render(<PillarMini pillars={PILLARS} />);
    expect(screen.getByText('Tre')).toBeInTheDocument();
    expect(screen.getByText('Car')).toBeInTheDocument();
    expect(screen.getByText('Fee')).toBeInTheDocument();
    expect(screen.queryByText('TRE')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Treinos' })).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByRole('progressbar', { name: 'Feedback' })).toHaveAttribute('aria-valuenow', '88');
  });

  it('uses the warning color for a pillar below 70% only', () => {
    render(<PillarMini pillars={PILLARS} />);
    expect(screen.getByRole('progressbar', { name: 'Cardio' })).toHaveClass('score-bar__track--warning');
    expect(screen.getByRole('progressbar', { name: 'Treinos' })).not.toHaveClass('score-bar__track--warning');
    expect(screen.getByRole('progressbar', { name: 'Feedback' })).not.toHaveClass('score-bar__track--warning');
  });

  it('leaves out a pillar that had no target', () => {
    render(<PillarMini pillars={[...PILLARS, { pillar: 'diet', done: 0, expected: 0, adherence: 0 }]} />);
    expect(screen.queryByText('Die')).not.toBeInTheDocument();
    expect(screen.queryByText('Hid')).not.toBeInTheDocument();
    expect(screen.getAllByRole('progressbar')).toHaveLength(3);
  });
});
