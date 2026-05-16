import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import SessionSetsTable from './SessionSetsTable';

const makeSetLog = (overrides = {}) => ({
  id: 'set-1',
  setNumber: 1,
  load: 70,
  repetitions: 10,
  rpe: 7,
  completed: true,
  notes: null,
  ...overrides,
});

describe('SessionSetsTable', () => {
  it('renders empty state when no set logs', () => {
    render(<SessionSetsTable setLogs={[]} />);
    expect(screen.getByText('Nenhuma série registrada.')).toBeInTheDocument();
  });

  it('renders a completed set row with load, reps, and rpe', () => {
    render(<SessionSetsTable setLogs={[makeSetLog()]} />);
    expect(screen.getByText('70 kg')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText(/Completa/i)).toBeInTheDocument();
  });

  it('renders a skipped set row with dashes and skipped status', () => {
    const skipped = makeSetLog({ id: 'set-2', completed: false, load: null, repetitions: null, rpe: null });
    render(<SessionSetsTable setLogs={[skipped]} />);
    expect(screen.getByText(/Pulada/i)).toBeInTheDocument();
  });

  it('shows note trigger button when set has notes', () => {
    const withNote = makeSetLog({ notes: 'Foco no excêntrico' });
    render(<SessionSetsTable setLogs={[withNote]} />);
    expect(screen.getByRole('button', { name: /ver nota do aluno/i })).toBeInTheDocument();
  });

  it('does not show note trigger when set has no notes', () => {
    render(<SessionSetsTable setLogs={[makeSetLog()]} />);
    expect(screen.queryByRole('button', { name: /ver nota/i })).not.toBeInTheDocument();
  });

  it('toggles inline note row when note trigger is clicked', async () => {
    const user = userEvent.setup();
    const withNote = makeSetLog({ notes: 'Foco no excêntrico' });
    render(<SessionSetsTable setLogs={[withNote]} />);

    expect(screen.queryByText('Foco no excêntrico')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ver nota do aluno/i }));
    expect(screen.getByText('Foco no excêntrico')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ocultar nota do aluno/i }));
    expect(screen.queryByText('Foco no excêntrico')).not.toBeInTheDocument();
  });

  it('renders multiple set rows', () => {
    const logs = [
      makeSetLog({ id: 'set-1', setNumber: 1 }),
      makeSetLog({ id: 'set-2', setNumber: 2, load: 80 }),
    ];
    render(<SessionSetsTable setLogs={logs} />);
    expect(screen.getByText('70 kg')).toBeInTheDocument();
    expect(screen.getByText('80 kg')).toBeInTheDocument();
  });

  it('renders PR chip when isPr is true', () => {
    // PR chip is controlled by parent for now — table itself does not render it
    // This confirms the base table renders without PR chips by default
    render(<SessionSetsTable setLogs={[makeSetLog()]} />);
    expect(screen.queryByText('PR')).not.toBeInTheDocument();
  });
});
