import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import EditSheetModal from './EditSheetModal';
import { buildSheet } from '../../test/nutritionFixtures';

describe('EditSheetModal', () => {
  it('is pre-filled from the sheet and submits the whole body', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<EditSheetModal sheet={buildSheet()} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    expect(screen.getByLabelText('Peso (kg)')).toHaveValue(66);
    await user.click(screen.getByRole('button', { name: 'Salvar ficha' }));
    expect(onSubmit).toHaveBeenCalledWith({ sex: 'female', weightKg: 66, heightCm: 165, bodyFatPct: 28, assessedAt: '2026-10-12' });
  });

  it('sends null for an emptied body fat and assessment date', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<EditSheetModal sheet={buildSheet()} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    await user.clear(screen.getByLabelText('% de gordura'));
    await user.clear(screen.getByLabelText('Data da avaliação'));
    await user.click(screen.getByRole('button', { name: 'Salvar ficha' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ bodyFatPct: null, assessedAt: null }));
  });

  it('does not submit without sex, weight or height', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<EditSheetModal sheet={buildSheet({ weightKg: null })} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Salvar ficha' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('cancels and disables the form while saving', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(<EditSheetModal sheet={buildSheet()} submitting={false} onClose={onClose} onSubmit={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(<EditSheetModal sheet={buildSheet()} submitting onClose={onClose} onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
  });
});
