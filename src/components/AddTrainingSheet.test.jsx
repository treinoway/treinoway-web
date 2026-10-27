import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, render, within } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import AddTrainingSheet from './AddTrainingSheet';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TEMPLATE_A = {
  id: 'tmpl-1',
  name: 'Peito & Tríceps',
  category: 'strength',
  bodySegment: 'upper',
  exerciseTemplates: [
    {
      id: 'ex-1',
      name: 'Supino reto',
      order: 1,
      sets: 4,
      repetitions: { min: 8, max: 12 },
      restInterval: 90,
      prescriptionMode: 'reps',
    },
    {
      id: 'ex-2',
      name: 'Crucifixo',
      order: 2,
      sets: 3,
      repetitions: { min: 10, max: 10 },
      restInterval: 60,
      prescriptionMode: 'reps',
    },
  ],
};

const TEMPLATE_B = {
  id: 'tmpl-2',
  name: 'Cardio HIIT',
  category: 'cardio',
  bodySegment: null,
  exerciseTemplates: [],
};

const TEMPLATE_C = {
  id: 'tmpl-3',
  name: 'Pernas',
  category: 'strength',
  bodySegment: 'lower',
  exerciseTemplates: [{ id: 'ex-3' }],
};

const ALL_TEMPLATES = [TEMPLATE_A, TEMPLATE_B, TEMPLATE_C];

const EDITING_TRAINING = {
  id: 'training-edit-1',
  name: 'Costas & Bíceps',
  category: 'strength',
  bodySegment: 'upper',
  description: 'Foco em dorsais e bíceps.',
};

const DEFAULT_PROPS = {
  open: true,
  onClose: vi.fn(),
  onCreate: vi.fn(),
  onImport: vi.fn(),
  onUpdate: vi.fn(),
  trainingTemplates: ALL_TEMPLATES,
  existingTrainingIds: new Set(),
  saving: false,
  eyebrow: 'Rotina Hipertrofia · Novo treino',
  editingTraining: null,
};

const renderSheet = (props = {}) =>
  render(<AddTrainingSheet {...DEFAULT_PROPS} {...props} />);

// ─── 1. Rendering — create mode ───────────────────────────────────────────────

describe('AddTrainingSheet — rendering (create mode)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders title "Novo treino" when open in create mode', () => {
    renderSheet();
    expect(screen.getByRole('heading', { name: 'Novo treino' })).toBeInTheDocument();
  });

  it('renders inside a drawer dialog named "Novo treino"', () => {
    renderSheet();
    expect(screen.getByRole('dialog', { name: 'Novo treino' })).toBeInTheDocument();
  });

  it('renders inside a drawer dialog named "Editar treino" in edit mode', () => {
    renderSheet({ editingTraining: EDITING_TRAINING });
    expect(screen.getByRole('dialog', { name: 'Editar treino' })).toBeInTheDocument();
  });

  it('keeps Cancelar and the primary action in the footer, outside the scroll body (create)', () => {
    renderSheet();
    // why: Drawer contract — body is role="region" named by the title; footer is outside it.
    const body = screen.getByRole('region', { name: 'Novo treino' });
    expect(within(body).queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
    expect(within(body).queryByRole('button', { name: /Adicionar e abrir/i })).not.toBeInTheDocument();
    const dialog = screen.getByRole('dialog', { name: 'Novo treino' });
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Adicionar e abrir/i })).toBeInTheDocument();
  });

  it('keeps Cancelar and Salvar alterações in the footer, outside the scroll body (edit)', () => {
    renderSheet({ editingTraining: EDITING_TRAINING });
    const body = screen.getByRole('region', { name: 'Editar treino' });
    expect(within(body).queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
    expect(within(body).queryByRole('button', { name: /Salvar alterações/i })).not.toBeInTheDocument();
    const dialog = screen.getByRole('dialog', { name: 'Editar treino' });
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Salvar alterações/i })).toBeInTheDocument();
  });

  it('renders eyebrow text when provided', () => {
    renderSheet();
    expect(screen.getByText('Rotina Hipertrofia · Novo treino')).toBeInTheDocument();
  });

  it('shows "Criar novo" tab as active by default', () => {
    renderSheet();
    const tab = screen.getByRole('tab', { name: /Criar novo/i });
    expect(tab).toHaveAttribute('aria-selected', 'true');
  });

  it('renders close button', () => {
    renderSheet();
    expect(screen.getByRole('button', { name: /Fechar/i })).toBeInTheDocument();
  });

  it('does not render when open=false', () => {
    renderSheet({ open: false });
    expect(screen.queryByRole('heading', { name: 'Novo treino' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

// ─── 1b. training day picker ─────────────────────────────────────────────────

describe('AddTrainingSheet — training day picker', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders a "Dia do treino" radiogroup with "Sem dia" checked in create mode', () => {
    renderSheet();
    const group = screen.getByRole('radiogroup', { name: /Dia do treino/i });
    expect(within(group).getByRole('radio', { name: 'Sem dia' })).toBeChecked();
  });

  it('renders the picker in edit mode with "Sem dia" when the training has no day', () => {
    renderSheet({ editingTraining: EDITING_TRAINING });
    const group = screen.getByRole('radiogroup', { name: /Dia do treino/i });
    expect(within(group).getByRole('radio', { name: 'Sem dia' })).toBeChecked();
  });

  it('pre-fills the picker from the training weekDay in edit mode', () => {
    renderSheet({ editingTraining: { ...EDITING_TRAINING, weekDay: 'friday' } });
    const group = screen.getByRole('radiogroup', { name: /Dia do treino/i });
    expect(within(group).getByRole('radio', { name: /^Sex/ })).toBeChecked();
  });

  it('payload does not contain weekDay when submitting create form', async () => {
    const onCreate = vi.fn().mockResolvedValue({ id: 'new-1' });
    const user = userEvent.setup();
    renderSheet({ onCreate });

    await user.type(screen.getByLabelText(/Nome do treino/i), 'Treino Sem Dia');
    await user.selectOptions(screen.getByLabelText(/Categoria/i), 'strength');
    await user.click(screen.getByRole('button', { name: /Adicionar e abrir/i }));

    await waitFor(() => {
      const payload = onCreate.mock.calls[0][0];
      expect(payload).not.toHaveProperty('weekDay');
    });
  });

  it('payload does not contain weekDay when submitting edit form', async () => {
    const onUpdate = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    renderSheet({ editingTraining: EDITING_TRAINING, onUpdate });

    await user.click(screen.getByRole('button', { name: /Salvar alterações/i }));

    await waitFor(() => {
      const payload = onUpdate.mock.calls[0][1];
      expect(payload).not.toHaveProperty('weekDay');
    });
  });
});

// ─── 2. Rendering — edit mode ─────────────────────────────────────────────────

describe('AddTrainingSheet — rendering (edit mode)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders title "Editar treino" when editingTraining is provided', () => {
    renderSheet({ editingTraining: EDITING_TRAINING });
    expect(screen.getByRole('heading', { name: /Editar treino/i })).toBeInTheDocument();
  });

  it('renders CTA "Salvar alterações" in edit mode', () => {
    renderSheet({ editingTraining: EDITING_TRAINING });
    expect(screen.getByRole('button', { name: /Salvar alterações/i })).toBeInTheDocument();
  });

  it('hides the library tab toggle in edit mode', () => {
    renderSheet({ editingTraining: EDITING_TRAINING });
    expect(screen.queryByRole('tab', { name: /Da biblioteca/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('pre-populates name field from editingTraining', () => {
    renderSheet({ editingTraining: EDITING_TRAINING });
    expect(screen.getByLabelText(/Nome do treino/i)).toHaveValue('Costas & Bíceps');
  });

  it('pre-populates category from editingTraining', () => {
    renderSheet({ editingTraining: EDITING_TRAINING });
    expect(screen.getByLabelText(/Categoria/i)).toHaveValue('strength');
  });

  it('auto-expands "Mostrar mais campos" when editingTraining has description', () => {
    renderSheet({ editingTraining: EDITING_TRAINING });
    // description field should be visible without clicking the toggle
    expect(screen.getByLabelText(/Descrição \(opcional\)/i)).toBeInTheDocument();
  });

  it('does not show info banner in edit mode', () => {
    renderSheet({ editingTraining: EDITING_TRAINING });
    expect(
      screen.queryByText(/Os exercícios serão adicionados/i)
    ).not.toBeInTheDocument();
  });

  it('does not show create hint text in edit mode', () => {
    renderSheet({ editingTraining: EDITING_TRAINING });
    expect(
      screen.queryByText(/Será salvo na sua biblioteca de treinos únicos/i)
    ).not.toBeInTheDocument();
  });
});

// ─── 3. Edit mode — submit ────────────────────────────────────────────────────

describe('AddTrainingSheet — edit mode submit', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls onUpdate with training id and payload on submit', async () => {
    const onUpdate = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    renderSheet({ editingTraining: EDITING_TRAINING, onUpdate });

    // Clear the name and type a new one
    const nameInput = screen.getByLabelText(/Nome do treino/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Costas Atualizado');

    await user.click(screen.getByRole('button', { name: /Salvar alterações/i }));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(
        EDITING_TRAINING.id,
        expect.objectContaining({ name: 'Costas Atualizado', category: 'strength' })
      );
    });
  });

  it('calls onClose after successful update', async () => {
    const onUpdate = vi.fn().mockResolvedValue({});
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSheet({ editingTraining: EDITING_TRAINING, onUpdate, onClose });

    await user.click(screen.getByRole('button', { name: /Salvar alterações/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it('keeps sheet open if onUpdate throws', async () => {
    const onUpdate = vi.fn().mockRejectedValue(new Error('API error'));
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSheet({ editingTraining: EDITING_TRAINING, onUpdate, onClose });

    await user.click(screen.getByRole('button', { name: /Salvar alterações/i }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
    // Sheet is still open
    expect(screen.getByRole('heading', { name: /Editar treino/i })).toBeInTheDocument();
  });

  it('does not call onCreate in edit mode', async () => {
    const onCreate = vi.fn();
    const onUpdate = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    renderSheet({ editingTraining: EDITING_TRAINING, onCreate, onUpdate });

    await user.click(screen.getByRole('button', { name: /Salvar alterações/i }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    expect(onCreate).not.toHaveBeenCalled();
  });
});

// ─── 4. Fechar ────────────────────────────────────────────────────────────────

describe('AddTrainingSheet — fechar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSheet({ onClose });

    await user.click(screen.getByRole('button', { name: /Fechar/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when overlay background is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSheet({ onClose });

    await user.click(screen.getByRole('dialog').parentElement);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape key is pressed', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSheet({ onClose });

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does NOT call onClose when clicking inside the sheet content', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSheet({ onClose });

    await user.click(screen.getByRole('heading', { name: 'Novo treino' }));
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ─── 6. Tab switch (create mode only) ────────────────────────────────────────

describe('AddTrainingSheet — tab switch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('clicking "Da biblioteca" shows the template list', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));

    expect(screen.getByRole('listbox', { name: /Treinos disponíveis/i })).toBeInTheDocument();
    expect(screen.getByText('Peito & Tríceps')).toBeInTheDocument();
  });

  it('"Da biblioteca" tab becomes aria-selected after click', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));

    expect(
      screen.getByRole('tab', { name: /Da biblioteca/i })
    ).toHaveAttribute('aria-selected', 'true');
  });
});

// ─── 7. Criar novo — happy path ───────────────────────────────────────────────

describe('AddTrainingSheet — criar novo happy path', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls onCreate with name and category when form is submitted', async () => {
    const onCreate = vi.fn().mockResolvedValue({ id: 'new-1' });
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSheet({ onCreate, onClose });

    await user.type(
      screen.getByLabelText(/Nome do treino/i),
      'Costas & Bíceps'
    );
    await user.selectOptions(screen.getByLabelText(/Categoria/i), 'strength');
    await user.click(screen.getByRole('button', { name: /Adicionar e abrir/i }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Costas & Bíceps', category: 'strength' })
      );
    });
  });

  it('calls onClose after successful create', async () => {
    const onCreate = vi.fn().mockResolvedValue({ id: 'new-1' });
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSheet({ onCreate, onClose });

    await user.type(screen.getByLabelText(/Nome do treino/i), 'Treino X');
    await user.selectOptions(screen.getByLabelText(/Categoria/i), 'cardio');
    await user.click(screen.getByRole('button', { name: /Adicionar e abrir/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it('does not include optional fields if left empty', async () => {
    const onCreate = vi.fn().mockResolvedValue({ id: 'new-1' });
    const user = userEvent.setup();
    renderSheet({ onCreate });

    await user.type(screen.getByLabelText(/Nome do treino/i), 'Treino Minimal');
    await user.selectOptions(screen.getByLabelText(/Categoria/i), 'mobility');
    await user.click(screen.getByRole('button', { name: /Adicionar e abrir/i }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({ name: 'Treino Minimal', category: 'mobility' });
    });
  });
});

// ─── 8. Criar novo — disabled state ──────────────────────────────────────────

describe('AddTrainingSheet — disabled state no modo criar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('primary button is disabled when name is empty', () => {
    renderSheet();
    expect(screen.getByRole('button', { name: /Adicionar e abrir/i })).toBeDisabled();
  });

  it('primary button is disabled when category is not selected', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.type(screen.getByLabelText(/Nome do treino/i), 'Treino Teste');
    expect(screen.getByRole('button', { name: /Adicionar e abrir/i })).toBeDisabled();
  });

  it('primary button is enabled when name and category are both filled', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.type(screen.getByLabelText(/Nome do treino/i), 'Treino Teste');
    await user.selectOptions(screen.getByLabelText(/Categoria/i), 'strength');

    expect(screen.getByRole('button', { name: /Adicionar e abrir/i })).not.toBeDisabled();
  });
});

// ─── 9. Mostrar mais campos ───────────────────────────────────────────────────

describe('AddTrainingSheet — mostrar mais campos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('description textarea is hidden by default', () => {
    renderSheet();
    expect(screen.queryByLabelText(/Descrição \(opcional\)/i)).not.toBeInTheDocument();
  });

  it('clicking toggle reveals description textarea', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole('button', { name: /Mostrar mais campos/i }));

    expect(screen.getByLabelText(/Descrição \(opcional\)/i)).toBeInTheDocument();
  });

  it('clicking toggle again hides description textarea', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole('button', { name: /Mostrar mais campos/i }));
    await user.click(screen.getByRole('button', { name: /Menos campos/i }));

    expect(screen.queryByLabelText(/Descrição \(opcional\)/i)).not.toBeInTheDocument();
  });

  it('description is included in onCreate payload when filled', async () => {
    const onCreate = vi.fn().mockResolvedValue({ id: 'new-1' });
    const user = userEvent.setup();
    renderSheet({ onCreate });

    await user.type(screen.getByLabelText(/Nome do treino/i), 'Treino Desc');
    await user.selectOptions(screen.getByLabelText(/Categoria/i), 'functional');
    await user.click(screen.getByRole('button', { name: /Mostrar mais campos/i }));
    await user.type(screen.getByLabelText(/Descrição \(opcional\)/i), 'Foco em funcional');
    await user.click(screen.getByRole('button', { name: /Adicionar e abrir/i }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Foco em funcional' })
      );
    });
  });
});

// ─── 10. Da biblioteca — filtro de busca ──────────────────────────────────────

describe('AddTrainingSheet — filtro de busca na biblioteca', () => {
  beforeEach(() => vi.clearAllMocks());

  it('filtering by name shows only matching templates', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));
    await user.type(screen.getByRole('textbox', { name: /Buscar treino/i }), 'Peito');

    expect(screen.getByText('Peito & Tríceps')).toBeInTheDocument();
    expect(screen.queryByText('Cardio HIIT')).not.toBeInTheDocument();
    expect(screen.queryByText('Pernas')).not.toBeInTheDocument();
  });

  it('filtering by category label shows matching templates', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));
    await user.type(screen.getByRole('textbox', { name: /Buscar treino/i }), 'Cardio');

    expect(screen.getByText('Cardio HIIT')).toBeInTheDocument();
    expect(screen.queryByText('Peito & Tríceps')).not.toBeInTheDocument();
  });
});

// ─── 11. Da biblioteca — empty state ─────────────────────────────────────────

describe('AddTrainingSheet — empty state na biblioteca', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows empty state when search has no matches', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));
    await user.type(
      screen.getByRole('textbox', { name: /Buscar treino/i }),
      'xyz não existe'
    );

    expect(screen.getByText(/Nenhum treino encontrado/i)).toBeInTheDocument();
  });
});

// ─── 12. Da biblioteca — seleção múltipla ────────────────────────────────────

describe('AddTrainingSheet — seleção múltipla na biblioteca', () => {
  beforeEach(() => vi.clearAllMocks());

  it('clicking two templates marks both as selected', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));
    await user.click(screen.getByRole('option', { name: /Peito & Tríceps/i }));
    await user.click(screen.getByRole('option', { name: /Cardio HIIT/i }));

    expect(
      screen.getByRole('option', { name: /Peito & Tríceps/i })
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('option', { name: /Cardio HIIT/i })
    ).toHaveAttribute('aria-selected', 'true');
  });

  it('calls onImport with selected ids on submit', async () => {
    const onImport = vi.fn().mockResolvedValue([]);
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSheet({ onImport, onClose });

    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));
    await user.click(screen.getByRole('option', { name: /Peito & Tríceps/i }));
    await user.click(screen.getByRole('option', { name: /Cardio HIIT/i }));
    await user.click(screen.getByRole('button', { name: /Adicionar treino/i }));

    await waitFor(() => {
      expect(onImport).toHaveBeenCalledWith(
        expect.arrayContaining(['tmpl-1', 'tmpl-2'])
      );
      expect(onImport.mock.calls[0][0]).toHaveLength(2);
    });
  });
});

// ─── 13. Da biblioteca — deselect ────────────────────────────────────────────

describe('AddTrainingSheet — deselect na biblioteca', () => {
  beforeEach(() => vi.clearAllMocks());

  it('clicking a selected template deselects it', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));
    await user.click(screen.getByRole('option', { name: /Peito & Tríceps/i }));
    await user.click(screen.getByRole('option', { name: /Peito & Tríceps/i }));

    expect(
      screen.getByRole('option', { name: /Peito & Tríceps/i })
    ).toHaveAttribute('aria-selected', 'false');
  });

  it('deselected template is not included in onImport call', async () => {
    const onImport = vi.fn().mockResolvedValue([]);
    const user = userEvent.setup();
    renderSheet({ onImport });

    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));
    await user.click(screen.getByRole('option', { name: /Peito & Tríceps/i }));
    await user.click(screen.getByRole('option', { name: /Pernas/i }));
    await user.click(screen.getByRole('option', { name: /Peito & Tríceps/i }));
    await user.click(screen.getByRole('button', { name: /Adicionar treino/i }));

    await waitFor(() => {
      expect(onImport).toHaveBeenCalledWith(['tmpl-3']);
    });
  });
});

// ─── 14. Da biblioteca — existingTrainingIds excluídos ───────────────────────

describe('AddTrainingSheet — existingTrainingIds excluídos da lista', () => {
  beforeEach(() => vi.clearAllMocks());

  it('templates already in the routine do not appear in the list', async () => {
    const user = userEvent.setup();
    renderSheet({ existingTrainingIds: new Set(['tmpl-1']) });

    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));

    expect(screen.queryByText('Peito & Tríceps')).not.toBeInTheDocument();
    expect(screen.getByText('Cardio HIIT')).toBeInTheDocument();
    expect(screen.getByText('Pernas')).toBeInTheDocument();
  });
});

// ─── 15. Reset ao fechar ──────────────────────────────────────────────────────

describe('AddTrainingSheet — reset ao fechar e reabrir', () => {
  it('fields are empty after closing and reopening', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(<AddTrainingSheet {...DEFAULT_PROPS} onClose={onClose} />);

    await user.type(screen.getByLabelText(/Nome do treino/i), 'Treino Temporário');
    expect(screen.getByLabelText(/Nome do treino/i)).toHaveValue('Treino Temporário');

    rerender(
      <AddTrainingSheet {...DEFAULT_PROPS} open={false} onClose={onClose} />
    );

    rerender(
      <AddTrainingSheet {...DEFAULT_PROPS} open={true} onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Nome do treino/i)).toHaveValue('');
    });
  });
});

// ─── 16. saving prop ─────────────────────────────────────────────────────────

describe('AddTrainingSheet — saving prop', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows "Adicionando…" on primary button when saving in create mode', () => {
    renderSheet({ saving: true });
    expect(screen.getByText(/Adicionando…/i)).toBeInTheDocument();
  });

  it('shows "Salvando…" on primary button when saving in edit mode', () => {
    renderSheet({ saving: true, editingTraining: EDITING_TRAINING });
    expect(screen.getByText(/Salvando…/i)).toBeInTheDocument();
  });

  it('disables both footer buttons when saving in create mode', () => {
    renderSheet({ saving: true });
    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeDisabled();
    const primaryBtn = screen.getByText(/Adicionando…/i).closest('button');
    expect(primaryBtn).toBeDisabled();
  });
});

// ─── 17. Da biblioteca — preview de exercícios ───────────────────────────────

describe('AddTrainingSheet — preview de exercícios na biblioteca', () => {
  beforeEach(() => vi.clearAllMocks());

  const openLibrary = async (user) => {
    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));
  };

  it('preview is hidden by default for every template', async () => {
    const user = userEvent.setup();
    renderSheet();
    await openLibrary(user);

    expect(screen.queryByText(/Supino reto/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Nenhum exercício neste treino/i)).not.toBeInTheDocument();
  });

  it('disclosure caret toggles preview visibility', async () => {
    const user = userEvent.setup();
    renderSheet();
    await openLibrary(user);

    const row = screen.getByRole('option', { name: /Peito & Tríceps/i });
    const caret = row.querySelector('button[aria-label="Ver exercícios"]');
    expect(caret).not.toBeNull();

    await user.click(caret);
    expect(screen.getByText(/Supino reto/i)).toBeInTheDocument();

    const closeCaret = row.querySelector('button[aria-label="Ocultar exercícios"]');
    expect(closeCaret).not.toBeNull();
    await user.click(closeCaret);
    expect(screen.queryByText(/Supino reto/i)).not.toBeInTheDocument();
  });

  it('aria-expanded reflects state on the disclosure button', async () => {
    const user = userEvent.setup();
    renderSheet();
    await openLibrary(user);

    const row = screen.getByRole('option', { name: /Peito & Tríceps/i });
    const caret = row.querySelector('button[aria-label="Ver exercícios"]');
    expect(caret).toHaveAttribute('aria-expanded', 'false');

    await user.click(caret);
    const openCaret = row.querySelector('button[aria-label="Ocultar exercícios"]');
    expect(openCaret).toHaveAttribute('aria-expanded', 'true');
  });

  it('clicking the caret does NOT toggle row selection', async () => {
    const user = userEvent.setup();
    renderSheet();
    await openLibrary(user);

    const row = screen.getByRole('option', { name: /Peito & Tríceps/i });
    expect(row).toHaveAttribute('aria-selected', 'false');

    const caret = row.querySelector('button[aria-label="Ver exercícios"]');
    await user.click(caret);

    expect(
      screen.getByRole('option', { name: /Peito & Tríceps/i })
    ).toHaveAttribute('aria-selected', 'false');
  });

  it('renders rep-range line correctly (sets × min–max + rest)', async () => {
    const user = userEvent.setup();
    renderSheet();
    await openLibrary(user);

    const caret = screen
      .getByRole('option', { name: /Peito & Tríceps/i })
      .querySelector('button[aria-label="Ver exercícios"]');
    await user.click(caret);

    expect(
      screen.getByText('1. Supino reto · 4 × 8–12 · 90s descanso')
    ).toBeInTheDocument();
  });

  it('renders single-value reps without the en-dash', async () => {
    const user = userEvent.setup();
    renderSheet();
    await openLibrary(user);

    const caret = screen
      .getByRole('option', { name: /Peito & Tríceps/i })
      .querySelector('button[aria-label="Ver exercícios"]');
    await user.click(caret);

    expect(
      screen.getByText('2. Crucifixo · 3 × 10 · 60s descanso')
    ).toBeInTheDocument();
  });

  it('renders duration-mode exercises with seconds suffix', async () => {
    const user = userEvent.setup();
    const TEMPLATE_DURATION = {
      id: 'tmpl-dur',
      name: 'Core Estável',
      category: 'mobility',
      bodySegment: 'core',
      trainingTemplateExerciseTemplates: [
        {
          id: 'ex-d1',
          name: 'Prancha',
          order: 1,
          sets: 3,
          repetitions: null,
          restInterval: 0,
          prescriptionMode: 'duration',
          duration: 30,
        },
      ],
    };
    renderSheet({ trainingTemplates: [TEMPLATE_DURATION] });
    await openLibrary(user);

    const caret = screen
      .getByRole('option', { name: /Core Estável/i })
      .querySelector('button[aria-label="Ver exercícios"]');
    await user.click(caret);

    expect(screen.getByText('1. Prancha · 3 × 30s')).toBeInTheDocument();
  });

  it('renders fallback "X séries" line when repetitions is null and not duration mode', async () => {
    const user = userEvent.setup();
    const TEMPLATE_NULL_REPS = {
      id: 'tmpl-null',
      name: 'Treino Aberto',
      category: 'functional',
      trainingTemplateExerciseTemplates: [
        {
          id: 'ex-n1',
          name: 'Movimento Livre',
          order: 1,
          sets: 3,
          repetitions: null,
          restInterval: 0,
          prescriptionMode: 'reps',
        },
      ],
    };
    renderSheet({ trainingTemplates: [TEMPLATE_NULL_REPS] });
    await openLibrary(user);

    const caret = screen
      .getByRole('option', { name: /Treino Aberto/i })
      .querySelector('button[aria-label="Ver exercícios"]');
    await user.click(caret);

    expect(screen.getByText('1. Movimento Livre · 3 séries')).toBeInTheDocument();
  });

  it('shows empty placeholder when template has no exercises', async () => {
    const user = userEvent.setup();
    renderSheet();
    await openLibrary(user);

    const caret = screen
      .getByRole('option', { name: /Cardio HIIT/i })
      .querySelector('button[aria-label="Ver exercícios"]');
    await user.click(caret);

    expect(screen.getByText(/Nenhum exercício neste treino/i)).toBeInTheDocument();
  });

  it('reads exercises from the new trainingTemplateExerciseTemplates field', async () => {
    const user = userEvent.setup();
    const TEMPLATE_NEW_FIELD = {
      id: 'tmpl-new',
      name: 'Treino Novo Campo',
      category: 'strength',
      trainingTemplateExerciseTemplates: [
        {
          id: 'ex-new',
          name: 'Agachamento',
          order: 1,
          sets: 5,
          repetitions: { min: 5, max: 5 },
          restInterval: 120,
          prescriptionMode: 'reps',
        },
      ],
    };
    renderSheet({ trainingTemplates: [TEMPLATE_NEW_FIELD] });
    await openLibrary(user);

    // Meta line uses the new field for the exercise count
    expect(screen.getByText(/1 exercícios/i)).toBeInTheDocument();

    const caret = screen
      .getByRole('option', { name: /Treino Novo Campo/i })
      .querySelector('button[aria-label="Ver exercícios"]');
    await user.click(caret);

    expect(
      screen.getByText('1. Agachamento · 5 × 5 · 120s descanso')
    ).toBeInTheDocument();
  });

  it('sorts preview lines by order even if input is out of order', async () => {
    const user = userEvent.setup();
    const TEMPLATE_UNSORTED = {
      id: 'tmpl-unsorted',
      name: 'Treino Desordenado',
      category: 'strength',
      trainingTemplateExerciseTemplates: [
        {
          id: 'ex-b',
          name: 'Segundo',
          order: 2,
          sets: 3,
          repetitions: { min: 10, max: 10 },
          restInterval: 0,
          prescriptionMode: 'reps',
        },
        {
          id: 'ex-a',
          name: 'Primeiro',
          order: 1,
          sets: 4,
          repetitions: { min: 8, max: 8 },
          restInterval: 0,
          prescriptionMode: 'reps',
        },
      ],
    };
    renderSheet({ trainingTemplates: [TEMPLATE_UNSORTED] });
    await openLibrary(user);

    const caret = screen
      .getByRole('option', { name: /Treino Desordenado/i })
      .querySelector('button[aria-label="Ver exercícios"]');
    await user.click(caret);

    expect(screen.getByText('1. Primeiro · 4 × 8')).toBeInTheDocument();
    expect(screen.getByText('2. Segundo · 3 × 10')).toBeInTheDocument();
  });
});
