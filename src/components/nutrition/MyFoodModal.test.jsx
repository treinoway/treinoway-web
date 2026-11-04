import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import MyFoodModal from './MyFoodModal';
import { buildFood, buildFoodGroups } from '../../test/nutritionFixtures';

const GROUPS = buildFoodGroups().items;

// Test helper: renders the modal.
const renderModal = (props = {}) =>
  render(<MyFoodModal food={null} groups={GROUPS} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} {...props} />);

describe('MyFoodModal', () => {
  it('titles the modal by mode', () => {
    const { unmount } = renderModal();
    expect(screen.getByRole('dialog', { name: 'Cadastrar alimento' })).toBeInTheDocument();
    unmount();
    renderModal({ food: buildFood() });
    expect(screen.getByRole('dialog', { name: 'Editar alimento' })).toBeInTheDocument();
  });

  it('flags every required field and does not submit an empty form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderModal({ onSubmit });
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getAllByText('Campo obrigatório.').length).toBeGreaterThanOrEqual(7);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits an edited food with fiber defaulting to 0 when emptied', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderModal({ food: buildFood({ name: 'Pão' }), onSubmit });
    await user.clear(screen.getByLabelText('Fibras (g/100 g)'));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Pão',
      groupId: 'g-cereais',
      portion: { label: '1 fatia média', grams: 100 },
      per100g: { kcal: 113, protein: 2.2, carbs: 25.3, fat: 0.7, fiber: 0 },
    });
  });

  it('rejects negative nutrients and a zero portion', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderModal({ food: buildFood(), onSubmit });
    await user.clear(screen.getByLabelText('Proteína (g/100 g)'));
    await user.type(screen.getByLabelText('Proteína (g/100 g)'), '-1');
    await user.clear(screen.getByLabelText('Porção (g)'));
    await user.type(screen.getByLabelText('Porção (g)'), '0');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByText('Não pode ser negativo.')).toBeInTheDocument();
    expect(screen.getByText('Informe um valor maior que zero.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('locks the form while saving', () => {
    renderModal({ food: buildFood(), submitting: true });
    expect(screen.getByLabelText('Nome do alimento')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
  });
});
