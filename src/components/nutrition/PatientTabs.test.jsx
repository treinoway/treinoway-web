import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import PatientTabs from './PatientTabs';

const TABS = [
  { id: 'plan', label: 'Plano alimentar' },
  { id: 'anamnesis', label: 'Anamnese' },
];

describe('PatientTabs', () => {
  it('marks the active tab', () => {
    render(<PatientTabs ariaLabel="Seções do paciente" tabs={TABS} value="plan" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Plano alimentar' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Anamnese' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange with the clicked tab', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PatientTabs ariaLabel="Seções do paciente" tabs={TABS} value="plan" onChange={onChange} />);
    await user.click(screen.getByRole('tab', { name: 'Anamnese' }));
    expect(onChange).toHaveBeenCalledWith('anamnesis');
  });

  it('shows the count of a tab when given', () => {
    render(<PatientTabs ariaLabel="Seções" tabs={[{ id: 'a', label: 'Pacientes', count: 3 }]} value="a" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Pacientes (3)' })).toBeInTheDocument();
  });
});
