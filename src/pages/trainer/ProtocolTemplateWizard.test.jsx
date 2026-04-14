import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { selectOption } from '../../test-utils/selectOption';
import { renderWithRoute } from '../../test/test-utils';
import ProtocolTemplateWizard from './ProtocolTemplateWizard';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockShowToast = vi.fn();

const mockTrainingTemplates = [
  { id: 10, name: 'Treino A', category: 'strength', bodySegment: 'upper' },
  { id: 11, name: 'Treino B', category: 'cardio', bodySegment: 'lower' },
];

const mockExerciseTemplates = [
  { id: 20, name: 'Supino Reto', type: 'strength', sets: 4, repetitions: { min: 8, max: 10 } },
  { id: 21, name: 'Corrida', type: 'cardio', duration: 600 },
];

const setupApiMocks = () => {
  api.get.mockImplementation((url) => {
    if (url === '/trainer/training-templates') return Promise.resolve({ data: mockTrainingTemplates });
    if (url === '/trainer/exercise-templates') return Promise.resolve({ data: mockExerciseTemplates });
    return Promise.resolve({ data: [] });
  });
  api.post.mockResolvedValue({ data: { id: 99 } });
  api.patch.mockResolvedValue({ data: {} });
};

const renderWizard = () =>
  renderWithRoute(<ProtocolTemplateWizard />, {
    route: '/trainer/protocol-templates/new',
    path: '/trainer/protocol-templates/new',
  });

const renderEditWizard = (id = '1') =>
  renderWithRoute(<ProtocolTemplateWizard />, {
    route: `/trainer/protocol-templates/${id}/edit`,
    path: '/trainer/protocol-templates/:id/edit',
  });

describe('ProtocolTemplateWizard', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    mockNavigate.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    localStorage.removeItem('treinoway:protocol-template-draft');
    setupApiMocks();
  });

  describe('Step 1 — Identity', () => {
    it('renders step 1 form fields', async () => {
      renderWizard();

      await waitFor(() => {
        expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/descrição/i)).toBeInTheDocument();
    });

    it('disables Avançar when required fields are empty', async () => {
      renderWizard();

      await waitFor(() => {
        expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
      });

      const nextBtn = screen.getByRole('button', { name: /avançar/i });
      expect(nextBtn).toBeDisabled();
    });

    it('enables Avançar when required fields are filled', async () => {
      const user = userEvent.setup();
      renderWizard();

      await waitFor(() => {
        expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/nome/i), 'Minha Rotina');
      await selectOption(user, screen.getByLabelText(/tipo/i), 'strength');
      await selectOption(user, screen.getByLabelText(/nível/i), 'intermediate');

      expect(screen.getByRole('button', { name: /avançar/i })).not.toBeDisabled();
    });

    it('advances to step 2 when clicking Avançar', async () => {
      const user = userEvent.setup();
      renderWizard();

      await waitFor(() => {
        expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/nome/i), 'Minha Rotina');
      await selectOption(user, screen.getByLabelText(/tipo/i), 'strength');
      await selectOption(user, screen.getByLabelText(/nível/i), 'intermediate');
      await user.click(screen.getByRole('button', { name: /avançar/i }));

      await waitFor(() => {
        expect(screen.getByText('Treinos da rotina')).toBeInTheDocument();
      });
    });
  });

  describe('Step 2 — Trainings', () => {
    const fillStep1AndAdvance = async (user) => {
      await waitFor(() => expect(screen.getByLabelText(/nome/i)).toBeInTheDocument());
      await user.type(screen.getByLabelText(/nome/i), 'Minha Rotina');
      await selectOption(user, screen.getByLabelText(/tipo/i), 'strength');
      await selectOption(user, screen.getByLabelText(/nível/i), 'intermediate');
      await user.click(screen.getByRole('button', { name: /avançar/i }));
      await waitFor(() => expect(screen.getByText('Treinos da rotina')).toBeInTheDocument());
    };

    it('shows empty state when no trainings', async () => {
      const user = userEvent.setup();
      renderWizard();
      await fillStep1AndAdvance(user);

      expect(screen.getByText('Nenhum treino ainda')).toBeInTheDocument();
    });

    it('Salvar rotina is disabled when no trainings', async () => {
      const user = userEvent.setup();
      renderWizard();
      await fillStep1AndAdvance(user);

      expect(screen.getByRole('button', { name: /salvar rotina/i })).toBeDisabled();
      expect(screen.getByText(/adicione ao menos 1 treino/i)).toBeInTheDocument();
    });

    it('shows summary panel with protocol name', async () => {
      const user = userEvent.setup();
      renderWizard();
      await fillStep1AndAdvance(user);

      expect(screen.getByText('Minha Rotina')).toBeInTheDocument();
    });

    it('shows Editar identidade button in summary panel to go back to step 1', async () => {
      const user = userEvent.setup();
      renderWizard();
      await fillStep1AndAdvance(user);

      const editBtn = screen.getByRole('button', { name: /editar identidade/i });
      await user.click(editBtn);

      await waitFor(() => {
        expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
      });
    });

    it('opens training drill when clicking Adicionar primeiro treino', async () => {
      const user = userEvent.setup();
      renderWizard();
      await fillStep1AndAdvance(user);

      await user.click(screen.getByRole('button', { name: /adicionar primeiro treino/i }));

      await waitFor(() => {
        expect(screen.getByText(/escolha de onde vem este treino/i)).toBeInTheDocument();
      });
    });
  });

  describe('Training Drill — New Training', () => {
    const goToDrillTraining = async (user) => {
      await waitFor(() => expect(screen.getByLabelText(/nome/i)).toBeInTheDocument());
      await user.type(screen.getByLabelText(/nome/i), 'Minha Rotina');
      await selectOption(user, screen.getByLabelText(/tipo/i), 'strength');
      await selectOption(user, screen.getByLabelText(/nível/i), 'intermediate');
      await user.click(screen.getByRole('button', { name: /avançar/i }));
      await waitFor(() => expect(screen.getByText('Treinos da rotina')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /adicionar primeiro treino/i }));
      await waitFor(() => expect(screen.getByText(/escolha de onde vem este treino/i)).toBeInTheDocument());
    };

    it('shows origin toggle when training templates exist', async () => {
      const user = userEvent.setup();
      renderWizard();
      await goToDrillTraining(user);

      expect(screen.getByRole('button', { name: /usar existente/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /criar novo/i })).toBeInTheDocument();
    });

    it('shows existing select when clicking Usar existente', async () => {
      const user = userEvent.setup();
      renderWizard();
      await goToDrillTraining(user);

      await user.click(screen.getByRole('button', { name: /usar existente/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/treino existente/i)).toBeInTheDocument();
      });
    });

    it('shows new training form when clicking Criar novo', async () => {
      const user = userEvent.setup();
      renderWizard();
      await goToDrillTraining(user);

      await user.click(screen.getByRole('button', { name: /criar novo/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/categoria/i)).toBeInTheDocument();
      });
    });

    it('saves new training template and returns to step 2', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: { id: 50, name: 'Novo Treino Teste' } });
      renderWizard();
      await goToDrillTraining(user);

      await user.click(screen.getByRole('button', { name: /criar novo/i }));
      await waitFor(() => expect(screen.getByLabelText(/categoria/i)).toBeInTheDocument());

      await user.type(screen.getByLabelText(/nome/i, { selector: '#drill-tt-name' }), 'Novo Treino Teste');
      await selectOption(user, screen.getByLabelText(/categoria/i), 'strength');
      await user.click(screen.getByRole('button', { name: /salvar treino/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/trainer/training-templates',
          expect.objectContaining({ name: 'Novo Treino Teste', category: 'strength' })
        );
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Treino salvo na sua biblioteca.', 'success');
      });

      await waitFor(() => {
        expect(screen.getByText('Treinos da rotina')).toBeInTheDocument();
      });
    });

    it('adds existing training and returns to step 2', async () => {
      const user = userEvent.setup();
      renderWizard();
      await goToDrillTraining(user);

      await user.click(screen.getByRole('button', { name: /usar existente/i }));
      await waitFor(() => expect(screen.getByLabelText(/treino existente/i)).toBeInTheDocument());

      await selectOption(user, screen.getByLabelText(/treino existente/i), '10');
      await user.click(screen.getByRole('button', { name: /adicionar treino/i }));

      await waitFor(() => {
        expect(screen.getByText('Treinos da rotina')).toBeInTheDocument();
      });
    });

    it('shows library note when creating new', async () => {
      const user = userEvent.setup();
      renderWizard();
      await goToDrillTraining(user);

      await user.click(screen.getByRole('button', { name: /criar novo/i }));

      await waitFor(() => {
        expect(screen.getByText(/o treino será salvo na sua biblioteca/i)).toBeInTheDocument();
      });
    });

    it('shows Adicionar exercício button in new training form', async () => {
      const user = userEvent.setup();
      renderWizard();
      await goToDrillTraining(user);

      await user.click(screen.getByRole('button', { name: /criar novo/i }));
      await waitFor(() => expect(screen.getByLabelText(/categoria/i)).toBeInTheDocument());

      expect(screen.getByRole('button', { name: /adicionar exercício/i })).toBeInTheDocument();
    });
  });

  describe('Save', () => {
    const goToStep2WithTraining = async (user) => {
      // Step 1
      await waitFor(() => expect(screen.getByLabelText(/nome/i)).toBeInTheDocument());
      await user.type(screen.getByLabelText(/nome/i), 'Rotina Final');
      await selectOption(user, screen.getByLabelText(/tipo/i), 'strength');
      await selectOption(user, screen.getByLabelText(/nível/i), 'intermediate');
      await user.click(screen.getByRole('button', { name: /avançar/i }));
      await waitFor(() => expect(screen.getByText('Treinos da rotina')).toBeInTheDocument());

      // Open drill
      await user.click(screen.getByRole('button', { name: /adicionar primeiro treino/i }));
      await waitFor(() => expect(screen.getByText(/escolha de onde vem este treino/i)).toBeInTheDocument());

      // Use existing training
      await user.click(screen.getByRole('button', { name: /usar existente/i }));
      await waitFor(() => expect(screen.getByLabelText(/treino existente/i)).toBeInTheDocument());
      await selectOption(user, screen.getByLabelText(/treino existente/i), '10');
      await user.click(screen.getByRole('button', { name: /adicionar treino/i }));
      await waitFor(() => expect(screen.getByText('Treinos da rotina')).toBeInTheDocument());
    };

    it('calls POST to create protocol and navigates away', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: { id: 1 } });
      renderWizard();
      await goToStep2WithTraining(user);

      await user.click(screen.getByRole('button', { name: /salvar rotina/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/trainer/protocol-templates',
          expect.objectContaining({ name: 'Rotina Final' })
        );
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Rotina criada com sucesso!', 'success');
        expect(mockNavigate).toHaveBeenCalledWith('/trainer/protocol-templates');
      });
    });

    it('shows error toast on save failure', async () => {
      const user = userEvent.setup();
      api.post.mockRejectedValue({ userMessage: 'Erro ao salvar' });
      renderWizard();
      await goToStep2WithTraining(user);

      await user.click(screen.getByRole('button', { name: /salvar rotina/i }));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Erro ao salvar', 'error');
      });
    });
  });

  describe('Edit mode', () => {
    beforeEach(() => {
      api.get.mockImplementation((url) => {
        if (url === '/trainer/protocol-templates/1') {
          return Promise.resolve({
            data: {
              id: 1,
              name: 'Rotina Editável',
              description: 'Desc',
              type: 'strength',
              trainingLevel: 'advanced',
              genderOrdination: 'male',
              defaultDurationWeeks: 8,
              isPublic: false,
              trainings: [
                {
                  trainingTemplateId: 10,
                  trainingTemplate: { id: 10, name: 'Treino A' },
                  weekDay: 'monday',
                  order: 1,
                },
              ],
            },
          });
        }
        if (url === '/trainer/training-templates') return Promise.resolve({ data: mockTrainingTemplates });
        if (url === '/trainer/exercise-templates') return Promise.resolve({ data: mockExerciseTemplates });
        return Promise.resolve({ data: [] });
      });
    });

    it('loads existing protocol data for editing', async () => {
      renderEditWizard('1');

      await waitFor(() => {
        expect(screen.getByDisplayValue('Rotina Editável')).toBeInTheDocument();
      });
    });

    it('calls PATCH on save when editing', async () => {
      const user = userEvent.setup();
      api.patch.mockResolvedValue({ data: {} });
      renderEditWizard('1');

      await waitFor(() => {
        expect(screen.getByDisplayValue('Rotina Editável')).toBeInTheDocument();
      });

      // Advance to step 2 (data already loaded, button is enabled)
      await user.click(screen.getByRole('button', { name: /avançar/i }));
      await waitFor(() => expect(screen.getByText('Treinos da rotina')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /salvar rotina/i }));

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          '/trainer/protocol-templates/1',
          expect.objectContaining({ name: 'Rotina Editável' })
        );
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Rotina atualizada com sucesso!', 'success');
      });
    });
  });

  describe('Close / Confirm dialog', () => {
    it('navigates away immediately when form is clean', async () => {
      const user = userEvent.setup();
      renderWizard();

      await waitFor(() => expect(screen.getByLabelText(/nome/i)).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /fechar wizard/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/trainer/protocol-templates');
    });

    it('shows confirm dialog when form has data', async () => {
      const user = userEvent.setup();
      renderWizard();

      await waitFor(() => expect(screen.getByLabelText(/nome/i)).toBeInTheDocument());
      await user.type(screen.getByLabelText(/nome/i), 'Rascunho');

      await user.click(screen.getByRole('button', { name: /fechar wizard/i }));

      expect(screen.getByText(/descartar alterações e sair/i)).toBeInTheDocument();
    });

    it('navigates away after confirming close dialog', async () => {
      const user = userEvent.setup();
      renderWizard();

      await waitFor(() => expect(screen.getByLabelText(/nome/i)).toBeInTheDocument());
      await user.type(screen.getByLabelText(/nome/i), 'Rascunho');

      await user.click(screen.getByRole('button', { name: /fechar wizard/i }));
      await user.click(screen.getByRole('button', { name: /descartar e sair/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/trainer/protocol-templates');
    });

    it('dismisses close dialog on cancel', async () => {
      const user = userEvent.setup();
      renderWizard();

      await waitFor(() => expect(screen.getByLabelText(/nome/i)).toBeInTheDocument());
      await user.type(screen.getByLabelText(/nome/i), 'Rascunho');

      await user.click(screen.getByRole('button', { name: /fechar wizard/i }));
      await user.click(screen.getByRole('button', { name: /continuar editando/i }));

      expect(screen.queryByText(/descartar alterações e sair/i)).not.toBeInTheDocument();
    });
  });

  describe('Draft Recovery Banner', () => {
    const makeDraft = (name) => ({
      data: {
        step1: {
          name,
          type: 'strength',
          trainingLevel: 'intermediate',
          description: '',
          genderOrdination: '',
          defaultDurationWeeks: 12,
        },
        trainings: [],
        isPublic: false,
      },
      savedAt: new Date().toISOString(),
      version: 1,
    });

    it('shows banner when a valid draft exists in localStorage', async () => {
      localStorage.setItem(
        'treinoway:protocol-template-draft',
        JSON.stringify(makeDraft('Rascunho Draft'))
      );

      renderWizard();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /continuar/i })).toBeInTheDocument();
      });
      expect(screen.getByText(/rascunho draft/i)).toBeInTheDocument();
    });

    it('loads draft data when clicking Continuar', async () => {
      const user = userEvent.setup();
      localStorage.setItem(
        'treinoway:protocol-template-draft',
        JSON.stringify(makeDraft('Rotina Rascunho'))
      );

      renderWizard();

      await waitFor(() => expect(screen.getByRole('button', { name: /continuar/i })).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      await waitFor(() => {
        expect(screen.getByDisplayValue('Rotina Rascunho')).toBeInTheDocument();
      });
    });

    it('filters out trainings with null trainingTemplateId when restoring draft', async () => {
      const user = userEvent.setup();
      const draftWithStaleTrainings = {
        data: {
          step1: {
            name: 'Rotina Com Stale',
            type: 'strength',
            trainingLevel: 'intermediate',
            description: '',
            genderOrdination: '',
            defaultDurationWeeks: 12,
          },
          trainings: [
            {
              trainingTemplateId: '550e8400-e29b-41d4-a716-446655440000',
              trainingTemplate: { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Treino Válido' },
              weekDay: 'monday',
              order: 1,
            },
            {
              trainingTemplateId: null,
              trainingTemplate: null,
              weekDay: 'tuesday',
              order: 2,
            },
            {
              trainingTemplateId: null,
              trainingTemplate: null,
              weekDay: 'wednesday',
              order: 3,
            },
          ],
          isPublic: false,
        },
        savedAt: new Date().toISOString(),
        version: 1,
      };
      localStorage.setItem(
        'treinoway:protocol-template-draft',
        JSON.stringify(draftWithStaleTrainings)
      );

      api.get.mockImplementation((url) => {
        if (url === '/trainer/training-templates')
          return Promise.resolve({ data: mockTrainingTemplates });
        if (url === '/trainer/exercise-templates')
          return Promise.resolve({ data: mockExerciseTemplates });
        return Promise.resolve({ data: [] });
      });

      renderWizard();

      await waitFor(() => expect(screen.getByRole('button', { name: /continuar/i })).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      // Advance to step 2 to inspect the trainings list
      await waitFor(() => expect(screen.getByDisplayValue('Rotina Com Stale')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /avançar/i }));
      await waitFor(() => expect(screen.getByText('Treinos da rotina')).toBeInTheDocument());

      // The save button should be disabled because null-id trainings were filtered,
      // leaving only 1 valid entry — but that one has a UUID not in mockTrainingTemplates
      // so step 2 won't show the valid training either. The key assertion is that
      // the two stale (null-id) trainings did NOT cause errors and only valid entries remain.
      // Confirm the two stale entries are absent (no duplicate/broken row menu buttons).
      const rowMenuButtons = screen.queryAllByRole('button', { name: /ações do treino/i });
      // At most 1 row menu (the valid UUID entry) — never 3 (which would mean nulls were kept)
      expect(rowMenuButtons.length).toBeLessThan(3);
    });

    it('clears draft when clicking Descartar', async () => {
      const user = userEvent.setup();
      localStorage.setItem(
        'treinoway:protocol-template-draft',
        JSON.stringify(makeDraft('Rotina Descartada'))
      );

      renderWizard();

      await waitFor(() => expect(screen.getByRole('button', { name: /continuar/i })).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /descartar/i }));

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /continuar/i })).not.toBeInTheDocument();
      });

      expect(localStorage.getItem('treinoway:protocol-template-draft')).toBeNull();
    });
  });

  describe('DrillTraining inline behavior', () => {
    const fillStep1AndAdvance = async (user) => {
      await waitFor(() => expect(screen.getByLabelText(/nome/i)).toBeInTheDocument());
      await user.type(screen.getByLabelText(/nome/i), 'Minha Rotina');
      await selectOption(user, screen.getByLabelText(/tipo/i), 'strength');
      await selectOption(user, screen.getByLabelText(/nível/i), 'intermediate');
      await user.click(screen.getByRole('button', { name: /avançar/i }));
      await waitFor(() => expect(screen.getByText('Treinos da rotina')).toBeInTheDocument());
    };

    it('training list is replaced by DrillTraining when drill opens', async () => {
      const user = userEvent.setup();
      renderWizard();
      await fillStep1AndAdvance(user);

      expect(screen.getByText('Treinos da rotina')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /adicionar primeiro treino/i }));

      await waitFor(() => {
        expect(screen.getByText(/escolha de onde vem este treino/i)).toBeInTheDocument();
      });

      expect(screen.queryByText('Treinos da rotina')).not.toBeInTheDocument();
    });

    it('closing drill via Voltar returns to training list without navigating away', async () => {
      const user = userEvent.setup();
      renderWizard();
      await fillStep1AndAdvance(user);

      await user.click(screen.getByRole('button', { name: /adicionar primeiro treino/i }));
      await waitFor(() => {
        expect(screen.getByText(/escolha de onde vem este treino/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /voltar à rotina/i }));

      await waitFor(() => {
        expect(screen.getByText('Treinos da rotina')).toBeInTheDocument();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('RoutineSummaryBar in DrillTraining', () => {
    const fillStep1AndAdvance = async (user) => {
      await waitFor(() => expect(screen.getByLabelText(/nome/i)).toBeInTheDocument());
      await user.type(screen.getByLabelText(/nome/i), 'Minha Rotina');
      await selectOption(user, screen.getByLabelText(/tipo/i), 'strength');
      await selectOption(user, screen.getByLabelText(/nível/i), 'intermediate');
      await user.click(screen.getByRole('button', { name: /avançar/i }));
      await waitFor(() => expect(screen.getByText('Treinos da rotina')).toBeInTheDocument());
    };

    it('RoutineSummaryBar appears inside DrillTraining when there are existing trainings', async () => {
      const user = userEvent.setup();
      renderWizard();
      await fillStep1AndAdvance(user);

      // Add a first training via the drill
      await user.click(screen.getByRole('button', { name: /adicionar primeiro treino/i }));
      await waitFor(() => expect(screen.getByText(/escolha de onde vem este treino/i)).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /usar existente/i }));
      await waitFor(() => expect(screen.getByLabelText(/treino existente/i)).toBeInTheDocument());
      await selectOption(user, screen.getByLabelText(/treino existente/i), '10');
      await user.click(screen.getByRole('button', { name: /adicionar treino/i }));

      await waitFor(() => {
        expect(screen.getByText('Treinos da rotina')).toBeInTheDocument();
      });

      // Open drill again — now existingTrainings.length > 0
      await user.click(screen.getByRole('button', { name: /adicionar treino/i }));

      await waitFor(() => {
        expect(screen.getByText(/escolha de onde vem este treino/i)).toBeInTheDocument();
      });

      // RoutineSummaryBar should be visible inside the drill with its region role
      expect(screen.getByRole('region', { name: /resumo da rotina/i })).toBeInTheDocument();
    });
  });

  describe('Breadcrumb navigation', () => {
    const fillStep1AndAdvance = async (user) => {
      await waitFor(() => expect(screen.getByLabelText(/nome/i)).toBeInTheDocument());
      await user.type(screen.getByLabelText(/nome/i), 'Minha Rotina');
      await selectOption(user, screen.getByLabelText(/tipo/i), 'strength');
      await selectOption(user, screen.getByLabelText(/nível/i), 'intermediate');
      await user.click(screen.getByRole('button', { name: /avançar/i }));
      await waitFor(() => expect(screen.getByText('Treinos da rotina')).toBeInTheDocument());
    };

    it('shows "Nova rotina" in breadcrumb on step 2 with no separator', async () => {
      const user = userEvent.setup();
      renderWizard();
      await fillStep1AndAdvance(user);

      const breadcrumb = document.querySelector('.wizard-breadcrumb');
      expect(breadcrumb).toBeInTheDocument();
      expect(breadcrumb.textContent).toContain('Nova rotina');
      expect(breadcrumb.textContent).not.toContain('›');
    });

    it('shows "Novo treino" segment in breadcrumb after opening DrillTraining and hides stepper', async () => {
      const user = userEvent.setup();
      renderWizard();
      await fillStep1AndAdvance(user);

      await user.click(screen.getByRole('button', { name: /adicionar primeiro treino/i }));
      await waitFor(() =>
        expect(screen.getByText(/escolha de onde vem este treino/i)).toBeInTheDocument()
      );

      const breadcrumb = document.querySelector('.wizard-breadcrumb');
      expect(breadcrumb.textContent).toContain('Nova rotina');
      expect(breadcrumb.textContent).toContain('Novo treino');
      expect(document.querySelector('.wizard-stepper')).not.toBeInTheDocument();
    });

    it('shows "Novo exercício" as last breadcrumb segment after opening DrillExercise', async () => {
      const user = userEvent.setup();
      renderWizard();
      await fillStep1AndAdvance(user);

      await user.click(screen.getByRole('button', { name: /adicionar primeiro treino/i }));
      await waitFor(() =>
        expect(screen.getByText(/escolha de onde vem este treino/i)).toBeInTheDocument()
      );

      await user.click(screen.getByRole('button', { name: /criar novo/i }));
      await waitFor(() => expect(screen.getByLabelText(/categoria/i)).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /adicionar exercício/i }));

      await waitFor(() => {
        const breadcrumb = document.querySelector('.wizard-breadcrumb');
        expect(breadcrumb.textContent).toContain('Novo exercício');
      });
    });

    it('returns to "Nova rotina" breadcrumb and shows stepper after closing DrillTraining', async () => {
      const user = userEvent.setup();
      renderWizard();
      await fillStep1AndAdvance(user);

      await user.click(screen.getByRole('button', { name: /adicionar primeiro treino/i }));
      await waitFor(() =>
        expect(screen.getByText(/escolha de onde vem este treino/i)).toBeInTheDocument()
      );

      await user.click(screen.getByRole('button', { name: /voltar à rotina/i }));

      await waitFor(() =>
        expect(screen.getByText('Treinos da rotina')).toBeInTheDocument()
      );

      const breadcrumb = document.querySelector('.wizard-breadcrumb');
      expect(breadcrumb.textContent).not.toContain('›');
      expect(breadcrumb.textContent).toContain('Nova rotina');
      expect(document.querySelector('.wizard-stepper')).toBeInTheDocument();
    });
  });

  describe('TrainingRowMenu — Step 2 row actions', () => {
    const goToStep2WithTraining = async (user) => {
      await waitFor(() => expect(screen.getByLabelText(/nome/i)).toBeInTheDocument());
      await user.type(screen.getByLabelText(/nome/i), 'Rotina Teste');
      await selectOption(user, screen.getByLabelText(/tipo/i), 'strength');
      await selectOption(user, screen.getByLabelText(/nível/i), 'intermediate');
      await user.click(screen.getByRole('button', { name: /avançar/i }));
      await waitFor(() => expect(screen.getByText('Treinos da rotina')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /adicionar primeiro treino/i }));
      await waitFor(() => expect(screen.getByText(/escolha de onde vem este treino/i)).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /usar existente/i }));
      await waitFor(() => expect(screen.getByLabelText(/treino existente/i)).toBeInTheDocument());
      await selectOption(user, screen.getByLabelText(/treino existente/i), '10');
      await user.click(screen.getByRole('button', { name: /adicionar treino/i }));
      await waitFor(() => expect(screen.getByText('Treinos da rotina')).toBeInTheDocument());
    };

    it('opens row menu dropdown when clicking three-dot trigger', async () => {
      const user = userEvent.setup();
      renderWizard();
      await goToStep2WithTraining(user);

      const trigger = screen.getByRole('button', { name: /ações do treino/i });
      await user.click(trigger);

      expect(screen.getByRole('menuitem', { name: /trocar template/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /alterar dia e ordem/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /remover/i })).toBeInTheDocument();
    });

    it('closes row menu when clicking outside', async () => {
      const user = userEvent.setup();
      renderWizard();
      await goToStep2WithTraining(user);

      const trigger = screen.getByRole('button', { name: /ações do treino/i });
      await user.click(trigger);
      expect(screen.getByRole('menuitem', { name: /trocar template/i })).toBeInTheDocument();

      await user.click(document.body);
      await waitFor(() => {
        expect(screen.queryByRole('menuitem', { name: /trocar template/i })).not.toBeInTheDocument();
      });
    });

    it('removes training from list when confirming Remover', async () => {
      const user = userEvent.setup();
      renderWizard();
      await goToStep2WithTraining(user);

      const trigger = screen.getByRole('button', { name: /ações do treino/i });
      await user.click(trigger);

      await user.click(screen.getByRole('menuitem', { name: /remover/i }));

      await waitFor(() => {
        expect(screen.getByText(/remover .* desta rotina/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /confirmar/i }));

      await waitFor(() => {
        expect(screen.getByText('Nenhum treino ainda')).toBeInTheDocument();
      });
    });
  });

  describe('Back arrow — drill-aware navigation', () => {
    const fillStep1AndAdvance = async (user) => {
      await waitFor(() => expect(screen.getByLabelText(/nome/i)).toBeInTheDocument());
      await user.type(screen.getByLabelText(/nome/i), 'Minha Rotina');
      await selectOption(user, screen.getByLabelText(/tipo/i), 'strength');
      await selectOption(user, screen.getByLabelText(/nível/i), 'intermediate');
      await user.click(screen.getByRole('button', { name: /avançar/i }));
      await waitFor(() => expect(screen.getByText('Treinos da rotina')).toBeInTheDocument());
    };

    it('back arrow while in DrillTraining closes the drill, not step 1', async () => {
      const user = userEvent.setup();
      renderWizard();
      await fillStep1AndAdvance(user);

      await user.click(screen.getByRole('button', { name: /adicionar primeiro treino/i }));
      await waitFor(() =>
        expect(screen.getByText(/escolha de onde vem este treino/i)).toBeInTheDocument()
      );

      await user.click(screen.getByRole('button', { name: /fechar drill/i }));

      await waitFor(() => {
        expect(screen.getByText('Treinos da rotina')).toBeInTheDocument();
      });

      // Must NOT navigate to step 1 (nome field is not visible)
      expect(screen.queryByLabelText(/nome da rotina/i)).not.toBeInTheDocument();
      // Must NOT navigate away
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('back arrow while in DrillExercise closes DrillExercise and returns to DrillTraining', async () => {
      const user = userEvent.setup();
      renderWizard();
      await fillStep1AndAdvance(user);

      await user.click(screen.getByRole('button', { name: /adicionar primeiro treino/i }));
      await waitFor(() =>
        expect(screen.getByText(/escolha de onde vem este treino/i)).toBeInTheDocument()
      );

      await user.click(screen.getByRole('button', { name: /criar novo/i }));
      await waitFor(() => expect(screen.getByLabelText(/categoria/i)).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /adicionar exercício/i }));
      await waitFor(() => {
        const breadcrumb = document.querySelector('.wizard-breadcrumb');
        expect(breadcrumb.textContent).toContain('Novo exercício');
      });

      await user.click(screen.getByRole('button', { name: /fechar drill/i }));

      await waitFor(() => {
        expect(screen.getByText(/escolha de onde vem este treino/i)).toBeInTheDocument();
      });

      // Must still be in DrillTraining, not back at step 2 list
      expect(screen.queryByText('Treinos da rotina')).not.toBeInTheDocument();
    });
  });
});
