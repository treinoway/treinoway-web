import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test/test-utils';
import RoutineSummaryBar from './RoutineSummaryBar';

const makeTraining = (overrides) => ({
  _id: crypto.randomUUID(),
  name: 'Treino',
  weekDay: null,
  order: 1,
  ...overrides,
});

describe('RoutineSummaryBar', () => {
  describe('null when empty', () => {
    it('returns null when trainings array is empty', () => {
      const { container } = render(<RoutineSummaryBar trainings={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('day cells', () => {
    it('renders 7 day cells with correct Portuguese abbreviations', () => {
      const trainings = [makeTraining({ weekDay: 'monday', name: 'A' })];
      render(<RoutineSummaryBar trainings={trainings} />);

      const abbrevs = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
      abbrevs.forEach((abbrev) => {
        expect(screen.getByText(abbrev)).toBeInTheDocument();
      });
    });

    it('day cells are not interactive buttons', () => {
      const trainings = [makeTraining({ weekDay: 'monday' })];
      render(<RoutineSummaryBar trainings={trainings} />);

      // The cells container has aria-hidden — cells are not in accessibility tree as buttons
      const region = screen.getByRole('region', { name: /resumo da rotina/i });
      expect(region).toBeInTheDocument();

      // There is exactly one button: the toggle chevron
      expect(screen.getAllByRole('button')).toHaveLength(1);
    });

    it('shows dot only on days that have trainings', () => {
      const trainings = [
        makeTraining({ weekDay: 'monday', name: 'Treino A' }),
        makeTraining({ weekDay: 'monday', name: 'Treino B' }),
        makeTraining({ weekDay: 'wednesday', name: 'Treino C' }),
      ];
      const { container } = render(<RoutineSummaryBar trainings={trainings} />);

      // Cells with active days should have the --active class and contain a dot
      const activeCells = container.querySelectorAll('.routine-bar__cell--active');
      expect(activeCells).toHaveLength(2); // monday and wednesday

      const dots = container.querySelectorAll('.routine-bar__dot');
      expect(dots).toHaveLength(2);
    });

    it('does not show dot on days with no trainings', () => {
      const trainings = [makeTraining({ weekDay: 'friday', name: 'Treino F' })];
      const { container } = render(<RoutineSummaryBar trainings={trainings} />);

      const activeCells = container.querySelectorAll('.routine-bar__cell--active');
      expect(activeCells).toHaveLength(1);

      const dots = container.querySelectorAll('.routine-bar__dot');
      expect(dots).toHaveLength(1);
    });
  });

  describe('count label', () => {
    it('shows singular "1 treino" for a single scheduled training', () => {
      const trainings = [makeTraining({ weekDay: 'monday', name: 'Treino A' })];
      render(<RoutineSummaryBar trainings={trainings} />);
      expect(screen.getByText('1 treino')).toBeInTheDocument();
    });

    it('shows plural "3 treinos" for multiple scheduled trainings', () => {
      const trainings = [
        makeTraining({ weekDay: 'monday' }),
        makeTraining({ weekDay: 'tuesday' }),
        makeTraining({ weekDay: 'wednesday' }),
      ];
      render(<RoutineSummaryBar trainings={trainings} />);
      expect(screen.getByText('3 treinos')).toBeInTheDocument();
    });

    it('shows mixed label when some trainings have no day', () => {
      const trainings = [
        makeTraining({ weekDay: 'monday' }),
        makeTraining({ weekDay: 'tuesday' }),
        makeTraining({ weekDay: null }),
      ];
      render(<RoutineSummaryBar trainings={trainings} />);
      expect(screen.getByText('2 treinos · 1 sem dia')).toBeInTheDocument();
    });

    it('shows "sem dia" only when all trainings lack a day', () => {
      const trainings = [
        makeTraining({ weekDay: null }),
        makeTraining({ weekDay: '' }),
      ];
      render(<RoutineSummaryBar trainings={trainings} />);
      expect(screen.getByText('2 sem dia')).toBeInTheDocument();
    });

    it('shows "1 sem dia" for single unscheduled training', () => {
      const trainings = [makeTraining({ weekDay: undefined })];
      render(<RoutineSummaryBar trainings={trainings} />);
      expect(screen.getByText('1 sem dia')).toBeInTheDocument();
    });
  });

  describe('expand/collapse', () => {
    it('panel is hidden by default', () => {
      const trainings = [makeTraining({ weekDay: 'monday', name: 'Treino A' })];
      render(<RoutineSummaryBar trainings={trainings} />);

      const panel = document.getElementById('routine-bar-panel');
      expect(panel).toHaveAttribute('hidden');
    });

    it('chevron button toggles panel visibility', async () => {
      const user = userEvent.setup();
      const trainings = [makeTraining({ weekDay: 'monday', name: 'Treino A', order: 1 })];
      render(<RoutineSummaryBar trainings={trainings} />);

      const toggle = screen.getByRole('button', { name: /expandir resumo/i });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');

      await user.click(toggle);

      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      const panel = document.getElementById('routine-bar-panel');
      expect(panel).not.toHaveAttribute('hidden');
    });

    it('collapses when chevron is clicked again', async () => {
      const user = userEvent.setup();
      const trainings = [makeTraining({ weekDay: 'monday', name: 'Treino A', order: 1 })];
      render(<RoutineSummaryBar trainings={trainings} />);

      const toggle = screen.getByRole('button');
      await user.click(toggle);
      await user.click(toggle);

      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      const panel = document.getElementById('routine-bar-panel');
      expect(panel).toHaveAttribute('hidden');
    });
  });

  describe('expanded panel content', () => {
    it('shows training names grouped by weekday with order prefix', async () => {
      const user = userEvent.setup();
      const trainings = [
        makeTraining({ weekDay: 'monday', name: 'Peito e Tríceps', order: 1 }),
        makeTraining({ weekDay: 'wednesday', name: 'Costas e Bíceps', order: 1 }),
      ];
      render(<RoutineSummaryBar trainings={trainings} />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('1. Peito e Tríceps')).toBeInTheDocument();
      expect(screen.getByText('1. Costas e Bíceps')).toBeInTheDocument();
    });

    it('shows weekday group headings', async () => {
      const user = userEvent.setup();
      const trainings = [
        makeTraining({ weekDay: 'monday', name: 'Treino A', order: 1 }),
      ];
      render(<RoutineSummaryBar trainings={trainings} />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Segunda-feira')).toBeInTheDocument();
    });

    it('shows Sem dia group for unscheduled trainings', async () => {
      const user = userEvent.setup();
      const trainings = [
        makeTraining({ weekDay: 'monday', name: 'Treino A', order: 1 }),
        makeTraining({ weekDay: null, name: 'Treino Livre', order: 1 }),
      ];
      render(<RoutineSummaryBar trainings={trainings} />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('Sem dia')).toBeInTheDocument();
      expect(screen.getByText('1. Treino Livre')).toBeInTheDocument();
    });

    it('orders weekday groups in Mon→Sun order', async () => {
      const user = userEvent.setup();
      const trainings = [
        makeTraining({ weekDay: 'friday', name: 'Treino F', order: 1 }),
        makeTraining({ weekDay: 'monday', name: 'Treino M', order: 1 }),
      ];
      render(<RoutineSummaryBar trainings={trainings} />);

      await user.click(screen.getByRole('button'));

      const headings = document.querySelectorAll('.routine-bar__day-group-title');
      // Monday should appear before Friday
      const texts = Array.from(headings).map((h) => h.textContent);
      const mondayIdx = texts.indexOf('Segunda-feira');
      const fridayIdx = texts.indexOf('Sexta-feira');
      expect(mondayIdx).toBeLessThan(fridayIdx);
    });
  });

  describe('ARIA', () => {
    it('has correct role and aria-label on the root element', () => {
      const trainings = [makeTraining({ weekDay: 'monday' })];
      render(<RoutineSummaryBar trainings={trainings} />);

      expect(screen.getByRole('region', { name: /resumo da rotina/i })).toBeInTheDocument();
    });

    it('panel has correct id for aria-controls', () => {
      const trainings = [makeTraining({ weekDay: 'monday' })];
      render(<RoutineSummaryBar trainings={trainings} />);

      const toggle = screen.getByRole('button');
      expect(toggle).toHaveAttribute('aria-controls', 'routine-bar-panel');
      expect(document.getElementById('routine-bar-panel')).toBeInTheDocument();
    });
  });
});
