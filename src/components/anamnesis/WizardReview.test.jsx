import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import WizardReview from './WizardReview';

const summaries = [
  { id: 's1', title: 'Saúde', stepIndex: 0, answered: 3, total: 3, pending: 0 },
  { id: 's2', title: 'Rotina', stepIndex: 1, answered: 1, total: 4, pending: 2 },
  { id: 's3', title: 'Objetivos', stepIndex: 2, answered: 0, total: 1, pending: 1 },
];

describe('WizardReview', () => {
  it('shows answered counts per section', () => {
    render(<WizardReview summaries={summaries} onEdit={vi.fn()} />);
    expect(screen.getByText('3 de 3 respondidas')).toBeInTheDocument();
    expect(screen.getByText('1 de 4 respondidas')).toBeInTheDocument();
  });

  it('flags sections with pending questions and pluralises the count', () => {
    render(<WizardReview summaries={summaries} onEdit={vi.fn()} />);
    expect(screen.getByText('2 pendências')).toBeInTheDocument();
    expect(screen.getByText('1 pendência')).toBeInTheDocument();
  });

  it('offers "Corrigir" for pending sections and "Editar" for the others', () => {
    render(<WizardReview summaries={summaries} onEdit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Corrigir Rotina' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Corrigir Objetivos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar Saúde' })).toBeInTheDocument();
  });

  it('jumps to the step of the section', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<WizardReview summaries={summaries} onEdit={onEdit} />);
    await user.click(screen.getByRole('button', { name: 'Corrigir Rotina' }));
    expect(onEdit).toHaveBeenCalledWith(1);
    await user.click(screen.getByRole('button', { name: 'Editar Saúde' }));
    expect(onEdit).toHaveBeenLastCalledWith(0);
  });
});
