import { render, screen } from '../../test/test-utils';
import RoutineWeekGrid from './RoutineWeekGrid';

describe('RoutineWeekGrid', () => {
  it('renders the seven weekdays and counts trainings per day', () => {
    render(
      <RoutineWeekGrid
        trainings={[{ weekDay: 'monday' }, { weekDay: 'Monday' }, { weekDay: 'friday' }, { weekDay: null }]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Semana' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getAllByText('–')).toHaveLength(5);
  });
});
