import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, render, within } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import AddTrainingSheet from './AddTrainingSheet';

const EDITING = {
  id: 'training-edit-1',
  name: 'Costas & Bíceps',
  category: 'strength',
  bodySegment: 'upper',
  description: '',
  weekDay: 'wednesday',
};

const baseProps = {
  open: true,
  onClose: vi.fn(),
  onCreate: vi.fn(),
  onImport: vi.fn(),
  onUpdate: vi.fn(),
  trainingTemplates: [],
  existingTrainingIds: new Set(),
  saving: false,
  editingTraining: null,
  onAssignWeekDay: vi.fn(),
};

// Renders the sheet with the weekday fixtures.
const renderSheet = (props = {}) => render(<AddTrainingSheet {...baseProps} {...props} />);

// Returns the weekday radiogroup.
const getPicker = () => screen.getByRole('radiogroup', { name: /Dia do treino/i });

// Fills the required fields of the create form.
const fillCreateForm = async (user) => {
  await user.type(screen.getByLabelText(/Nome do treino/i), 'Pernas');
  await user.selectOptions(screen.getByLabelText(/Categoria/i), 'strength');
};

describe('AddTrainingSheet — weekday picker (criterion 26)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the optional picker with "Sem dia" checked in create mode', () => {
    renderSheet();
    const group = getPicker();
    ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Sem dia'].forEach((label) => {
      expect(within(group).getByRole('radio', { name: new RegExp(`^${label}`) })).toBeInTheDocument();
    });
    expect(within(group).getByRole('radio', { name: 'Sem dia' })).toBeChecked();
  });

  it('is absent in the library mode', async () => {
    const user = userEvent.setup();
    renderSheet();
    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));
    expect(screen.queryByRole('radiogroup', { name: /Dia do treino/i })).not.toBeInTheDocument();
  });

  it('pre-fills the training day in edit mode', () => {
    renderSheet({ editingTraining: EDITING });
    expect(within(getPicker()).getByRole('radio', { name: /^Qua/ })).toBeChecked();
  });

  it('assigns the picked day after creating, without sending weekDay in the payload', async () => {
    const onCreate = vi.fn().mockResolvedValue({ id: 'new-1' });
    const user = userEvent.setup();
    renderSheet({ onCreate });
    await fillCreateForm(user);
    await user.click(within(getPicker()).getByRole('radio', { name: /^Seg/ }));

    await user.click(screen.getByRole('button', { name: /Adicionar e abrir/i }));

    await waitFor(() => expect(baseProps.onAssignWeekDay).toHaveBeenCalledWith('new-1', 'monday'));
    expect(onCreate.mock.calls[0][0]).not.toHaveProperty('weekDay');
  });

  it('"Sem dia" on create assigns nothing', async () => {
    const onCreate = vi.fn().mockResolvedValue({ id: 'new-1' });
    const user = userEvent.setup();
    renderSheet({ onCreate });
    await fillCreateForm(user);

    await user.click(screen.getByRole('button', { name: /Adicionar e abrir/i }));

    await waitFor(() => expect(onCreate).toHaveBeenCalled());
    expect(baseProps.onAssignWeekDay).not.toHaveBeenCalled();
  });

  it('assigns a changed day on edit and clears it with "Sem dia"', async () => {
    const onUpdate = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    renderSheet({ editingTraining: EDITING, onUpdate });
    await user.click(within(getPicker()).getByRole('radio', { name: 'Sem dia' }));

    await user.click(screen.getByRole('button', { name: /Salvar alterações/i }));

    await waitFor(() => expect(baseProps.onAssignWeekDay).toHaveBeenCalledWith('training-edit-1', null));
  });

  it('assigns nothing on edit when the day is unchanged', async () => {
    const onUpdate = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    renderSheet({ editingTraining: EDITING, onUpdate });
    await user.type(screen.getByLabelText(/Nome do treino/i), ' B');

    await user.click(screen.getByRole('button', { name: /Salvar alterações/i }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    expect(baseProps.onAssignWeekDay).not.toHaveBeenCalled();
  });

  it('shows how many trainings already use each day, ignoring the edited training itself', () => {
    renderSheet({ editingTraining: EDITING, weekDayCounts: { monday: 2, wednesday: 1 } });
    const group = getPicker();
    expect(within(group).getByRole('radio', { name: /^Seg.*2 treinos/ })).toBeInTheDocument();
    expect(within(group).getByRole('radio', { name: /^Qua/ })).not.toHaveTextContent('treino');
  });

  it('shows a singular count in create mode', () => {
    renderSheet({ weekDayCounts: { friday: 1 } });
    expect(within(getPicker()).getByRole('radio', { name: /^Sex.*1 treino$/ })).toBeInTheDocument();
  });

  it('picking a day makes the form dirty (discard guard on Cancelar)', async () => {
    const user = userEvent.setup();
    renderSheet();
    await user.click(within(getPicker()).getByRole('radio', { name: /^Ter/ }));

    await user.click(screen.getByRole('button', { name: /^Cancelar$/ }));

    expect(await screen.findByRole('alertdialog', { name: 'Descartar alterações?' })).toBeInTheDocument();
  });

  it('keyboard: roving tabindex and arrow keys with wraparound', async () => {
    const user = userEvent.setup();
    renderSheet();
    const group = getPicker();
    expect(within(group).getByRole('radio', { name: 'Sem dia' })).toHaveAttribute('tabindex', '0');
    expect(within(group).getByRole('radio', { name: /^Seg/ })).toHaveAttribute('tabindex', '-1');

    await waitFor(() => expect(screen.getByLabelText(/Nome do treino/i)).toHaveFocus());
    within(group).getByRole('radio', { name: 'Sem dia' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(within(group).getByRole('radio', { name: /^Dom/ })).toBeChecked();
    expect(within(group).getByRole('radio', { name: /^Dom/ })).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(within(group).getByRole('radio', { name: 'Sem dia' })).toBeChecked();
    await user.keyboard('{ArrowUp}');
    expect(within(group).getByRole('radio', { name: /^Sáb/ })).toBeChecked();
  });
});
