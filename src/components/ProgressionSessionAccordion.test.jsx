import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../test/test-utils';
import ProgressionSessionAccordion from './ProgressionSessionAccordion';

const session = {
  sessionId: 's-1',
  date: '2026-09-21',
  status: 'completed',
  completedSets: 2,
  totalReps: 18,
  sets: [
    { setNumber: 1, repetitions: 9, load: 40, rpe: null, completed: true },
    { setNumber: 2, repetitions: 9, load: 40, rpe: 8, completed: true },
  ],
};

const renderAccordion = (props = {}) => render(
  <ul>
    <ProgressionSessionAccordion
      session={session}
      expanded
      onToggle={() => {}}
      hasLoad
      {...props}
    />
  </ul>,
);

describe('ProgressionSessionAccordion', () => {
  it('renders the date and summary in the header', () => {
    renderAccordion();
    expect(screen.getByText('21 set')).toBeInTheDocument();
    expect(screen.getByText('2 séries · 18 reps')).toBeInTheDocument();
  });

  it('reports expanded state and lists the sets', () => {
    renderAccordion();
    expect(screen.getByRole('button', { name: /Recolher sessão de 21 set/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Série 1')).toBeInTheDocument();
    expect(screen.getAllByText('40 kg')).toHaveLength(2);
    expect(screen.getByText('RPE 8')).toBeInTheDocument();
  });

  it('hides the sets when collapsed', () => {
    renderAccordion({ expanded: false });
    expect(screen.getByRole('button', { name: /Expandir sessão/ })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Série 1')).not.toBeInTheDocument();
  });

  it('calls onToggle when the header is clicked', async () => {
    const onToggle = vi.fn();
    renderAccordion({ onToggle });
    await userEvent.setup().click(screen.getByRole('button', { name: /Recolher/ }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows the abandoned badge only for abandoned sessions', () => {
    const { unmount } = renderAccordion({ session: { ...session, status: 'abandoned' } });
    expect(screen.getByText('Abandonada')).toBeInTheDocument();
    unmount();
    renderAccordion();
    expect(screen.queryByText('Abandonada')).not.toBeInTheDocument();
  });

  it('marks completed and skipped sets, omitting load when absent', () => {
    renderAccordion({
      session: {
        ...session,
        sets: [
          { setNumber: 1, repetitions: 8, load: 70, completed: true },
          { setNumber: 2, repetitions: 0, load: null, completed: false },
        ],
      },
    });
    expect(screen.getByRole('img', { name: 'Concluída' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Não concluída' })).toBeInTheDocument();
    expect(screen.getAllByText(/kg/)).toHaveLength(1);
  });

  it('hides load when the exercise has no load', () => {
    renderAccordion({ hasLoad: false });
    expect(screen.queryByText(/kg/)).not.toBeInTheDocument();
  });

  it('shows an empty message when there are no sets', () => {
    renderAccordion({ session: { ...session, sets: [] } });
    expect(screen.getByText('Sem séries registradas')).toBeInTheDocument();
  });

  it('does not shift date-only values by timezone', () => {
    renderAccordion({ session: { ...session, date: '2026-09-01' } });
    expect(screen.getByText('01 set')).toBeInTheDocument();
  });
});
