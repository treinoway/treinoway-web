import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import ProtocolTemplates from './ProtocolTemplates';
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
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

vi.mock('../../components/ExerciseTemplateForm', () => ({
  default: ({ exerciseTemplate, onSuccess, onCancel }) => (
    <div data-testid="exercise-template-form">
      {exerciseTemplate && <span data-testid="editing-exercise-id">{exerciseTemplate.id}</span>}
      <button
        onClick={() => onSuccess?.(exerciseTemplate
          ? { ...exerciseTemplate, name: 'Exercício Editado' }
          : { id: 99, name: 'Novo Exercício' }
        )}
        type="button"
      >
        {exerciseTemplate ? 'Simular exercício editado' : 'Simular exercício criado'}
      </button>
      <button onClick={onCancel} type="button">Cancelar exercício</button>
    </div>
  ),
}));

const mockShowToast = vi.fn();

const mockTemplates = [
  {
    id: 1,
    name: 'Modelo Força',
    description: 'Protocolo de força',
    defaultDurationWeeks: 12,
    genderOrdination: 'male',
    trainingLevel: 'intermediate',
  },
];

describe('ProtocolTemplates', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockImplementation((url) => {
      if (url === '/trainer/protocol-templates') return Promise.resolve({ data: mockTemplates });
      if (url === '/trainer/training-templates') {
        return Promise.resolve({
          data: [
            { id: 10, name: 'Treino A', category: 'strength', bodySegment: 'upper' },
            { id: 11, name: 'Treino B', category: 'cardio', bodySegment: 'lower' },
          ],
        });
      }
      if (url === '/trainer/exercise-templates') {
        return Promise.resolve({
          data: [
            { id: 20, name: 'Supino Reto', type: 'strength', sets: 4, repetitions: { min: 8, max: 10 }, hasLoad: true, suggestedLoad: 60 },
            { id: 21, name: 'Corrida', type: 'cardio', duration: 600, hasLoad: false },
            { id: 99, name: 'Novo Exercício', type: 'strength' },
          ],
        });
      }
      if (url === '/trainer/protocol-templates/1') {
        return Promise.resolve({
          data: {
            ...mockTemplates[0],
            scheduleTemplates: [],
          },
        });
      }
      if (url === '/trainer/training-templates/10') {
        return Promise.resolve({
          data: {
            id: 10,
            name: 'Treino A',
            category: 'strength',
            exerciseTemplateIds: [20, 21],
          },
        });
      }
      if (url === '/trainer/training-templates/11') {
        return Promise.resolve({
          data: {
            id: 11,
            name: 'Treino B',
            category: 'cardio',
            exerciseTemplateIds: [],
          },
        });
      }
      return Promise.resolve({ data: [] });
    });
    api.post.mockReset();
    api.patch.mockReset();
    api.delete.mockReset();
  });

  it('renders the page title', () => {
    renderWithRouter(<ProtocolTemplates />);

    expect(screen.getByText('Rotinas')).toBeInTheDocument();
  });

  it('fetches and displays templates on mount', async () => {
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });

    expect(screen.queryByText(/o que é um modelo\?/i)).not.toBeInTheDocument();
  });

  it('shows empty state when there are no templates', async () => {
    api.get.mockResolvedValue({ data: [] });

    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Nenhuma rotina ainda')).toBeInTheDocument();
    });

    expect(screen.getByText(/o que é um modelo\?/i)).toBeInTheDocument();
  });

  it('shows CTA button in empty state that opens the create form', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [] });

    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Nenhuma rotina ainda')).toBeInTheDocument();
    });

    const ctaButton = screen.getByRole('button', { name: /criar primeira rotina/i });
    expect(ctaButton).toBeInTheDocument();

    await user.click(ctaButton);

    expect(screen.getByText('Criar nova rotina')).toBeInTheDocument();
  });

  it('shows level badge when template has trainingLevel', async () => {
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));

    expect(screen.getByText('Intermediário')).toBeInTheDocument();
  });

  it('does not show level badge when template has no trainingLevel', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/trainer/protocol-templates') return Promise.resolve({ data: [{ id: 1, name: 'Sem Nível', defaultDurationWeeks: 8 }] });
      return Promise.resolve({ data: [] });
    });

    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Sem Nível'));

    const badges = document.querySelectorAll('.badge-blue');
    expect(badges).toHaveLength(0);
  });

  it('shows loading and avoids info banner flash before GET resolves', async () => {
    let resolveTemplates;
    const templatesPromise = new Promise((resolve) => {
      resolveTemplates = resolve;
    });

    api.get.mockImplementation((url) => {
      if (url === '/trainer/protocol-templates') return templatesPromise;
      if (url === '/trainer/training-templates') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    renderWithRouter(<ProtocolTemplates />);

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(screen.queryByText(/o que é um modelo\?/i)).not.toBeInTheDocument();

    resolveTemplates({ data: [] });

    await waitFor(() => {
      expect(screen.getByText(/o que é um modelo\?/i)).toBeInTheDocument();
    });
  });

  it('shows the create form when "+ Nova rotina" is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));

    expect(screen.getByText('Criar nova rotina')).toBeInTheDocument();
  });

  it('calls POST to create a template on form submission', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 2, name: 'Novo Modelo' } });
    api.get.mockResolvedValue({ data: [...mockTemplates, { id: 2, name: 'Novo Modelo', defaultDurationWeeks: 12 }] });

    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));

    const nameInput = screen.getAllByRole('textbox')[0];
    await user.type(nameInput, 'Novo Modelo');
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/protocol-templates', expect.objectContaining({
        name: 'Novo Modelo',
      }));
      expect(mockShowToast).toHaveBeenCalledWith('Modelo criado com sucesso!', 'success');
    });
  });

  it('shows RowMenu for each template card in card view', async () => {
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));

    expect(screen.getByRole('button', { name: /ações da rotina modelo força/i })).toBeInTheDocument();
  });

  it('populates form with existing data when Edit is clicked from RowMenu', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /ações da rotina modelo força/i }));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));

    expect(screen.getByText('Editar rotina')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Modelo Força')).toBeInTheDocument();
  });

  it('calls PATCH on save when editing an existing template via RowMenu', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({ data: mockTemplates[0] });

    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /ações da rotina modelo força/i }));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/trainer/protocol-templates/1', expect.any(Object));
      expect(mockShowToast).toHaveBeenCalledWith('Modelo atualizado com sucesso!', 'success');
    });
  });

  it('calls DELETE and shows success toast on template delete via RowMenu', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({});

    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /ações da rotina modelo força/i }));
    await user.click(screen.getByRole('button', { name: /^excluir$/i }));
    await waitFor(() => screen.getByRole('button', { name: /confirmar/i }));
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/protocol-templates/1');
      expect(mockShowToast).toHaveBeenCalledWith('Modelo excluído com sucesso!', 'success');
    });
  });

  it('does not delete when custom dialog confirmation is cancelled via RowMenu', async () => {
    const user = userEvent.setup();

    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /ações da rotina modelo força/i }));
    await user.click(screen.getByRole('button', { name: /^excluir$/i }));
    await waitFor(() => screen.getByRole('button', { name: /cancelar/i }));
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(api.delete).not.toHaveBeenCalled();
  });

  it('hides form on Cancel and returns to list view', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));

    expect(screen.getByText('Criar nova rotina')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(screen.queryByText('Criar nova rotina')).not.toBeInTheDocument();
  });

  it('opens add training modal when "Selecionar treino único" is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /selecionar treino único/i }));

    expect(screen.getByText('Adicionar Treino à Rotina')).toBeInTheDocument();
    expect(screen.getByLabelText('Treino único')).toBeInTheDocument();
    expect(screen.getByLabelText(/Dia da Semana/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Ordem')).toBeInTheDocument();
  });

  it('shows inline exercise template form when "Criar novo exercício" is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /criar novo treino único/i }));
    await user.click(screen.getByRole('button', { name: /criar novo exercício/i }));

    expect(screen.getByTestId('exercise-template-form')).toBeInTheDocument();
    expect(screen.queryByTestId('editing-exercise-id')).not.toBeInTheDocument();
  });

  it('shows "Criar exercício" title in modal header when creating inline exercise', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /criar novo treino único/i }));
    await user.click(screen.getByRole('button', { name: /criar novo exercício/i }));

    expect(screen.getByText('Criar exercício')).toBeInTheDocument();
  });

  it('adds newly created exercise to training template form after inline form success', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /criar novo treino único/i }));
    await user.click(screen.getByRole('button', { name: /criar novo exercício/i }));
    await user.click(screen.getByRole('button', { name: /simular exercício criado/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ações do exercício novo exercício/i })).toBeInTheDocument();
    });
  });

  it('returns to training template form when back button is clicked from exercise form', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /criar novo treino único/i }));
    await user.click(screen.getByRole('button', { name: /criar novo exercício/i }));

    expect(screen.getByTestId('exercise-template-form')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /voltar/i }));

    expect(screen.queryByTestId('exercise-template-form')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^nome/i, { selector: '#tt-modal-name' })).toBeInTheDocument();
  });

  it('returns to training template form when cancel is clicked in exercise form', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /criar novo treino único/i }));
    await user.click(screen.getByRole('button', { name: /criar novo exercício/i }));

    await user.click(screen.getByRole('button', { name: /cancelar exercício/i }));

    expect(screen.queryByTestId('exercise-template-form')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^nome/i, { selector: '#tt-modal-name' })).toBeInTheDocument();
  });

  it('training template form data persists after exercise creation round-trip', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /criar novo treino único/i }));

    await user.type(screen.getByLabelText(/^nome/i, { selector: '#tt-modal-name' }), 'Meu Treino');

    await user.click(screen.getByRole('button', { name: /criar novo exercício/i }));
    await user.click(screen.getByRole('button', { name: /cancelar exercício/i }));

    expect(screen.getByDisplayValue('Meu Treino')).toBeInTheDocument();
  });

  it('closes add training modal when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /selecionar treino único/i }));

    const modal = screen.getByText('Adicionar Treino à Rotina').closest('.bottom-sheet');
    expect(modal).toBeInTheDocument();

    await user.click(within(modal).getByRole('button', { name: /cancelar/i }));
    expect(screen.queryByText('Adicionar Treino à Rotina')).not.toBeInTheDocument();
  });

  it('adds and removes training rows via the modal', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /selecionar treino único/i }));

    await user.selectOptions(screen.getByLabelText('Treino único'), '10');
    await user.selectOptions(screen.getByLabelText(/Dia da Semana/i), 'monday');
    await user.click(screen.getByRole('button', { name: /^adicionar$/i }));

    expect(screen.queryByText('Adicionar Treino à Rotina')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ adicionar treino/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ações do treino treino a/i }));
    await user.click(screen.getByRole('button', { name: /^remover$/i }));
    expect(screen.getByRole('button', { name: /selecionar treino único/i })).toBeInTheDocument();
  });

  it('creates training template from inline modal', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 99, name: 'Treino Novo', category: 'strength' } });
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /criar novo treino único/i }));

    await user.type(screen.getByLabelText(/^nome/i, { selector: '#tt-modal-name' }), 'Treino Novo');
    await user.selectOptions(screen.getByLabelText('Categoria'), 'strength');
    await user.click(screen.getByRole('button', { name: /criar treino único/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/training-templates', expect.objectContaining({
        name: 'Treino Novo',
        category: 'strength',
      }));
      expect(mockShowToast).toHaveBeenCalledWith('Treino único criado com sucesso!', 'success');
    });
  });

  it('shows exercise templates in picker when training template modal is open', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /criar novo treino único/i }));

    expect(screen.getByLabelText(/selecionar exercício existente/i)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Supino Reto' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Corrida' })).toBeInTheDocument();
  });

  it('adds and removes exercise templates from the training template modal', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /criar novo treino único/i }));

    await user.selectOptions(screen.getByLabelText(/selecionar exercício existente/i), '20');
    await user.click(screen.getByRole('button', { name: /adicionar exercício ao treino/i }));

    expect(screen.getAllByText('Supino Reto').length).toBeGreaterThan(0);
    const actionsBtn = screen.getByRole('button', { name: /ações do exercício supino reto/i });
    expect(actionsBtn).toBeInTheDocument();

    await user.click(actionsBtn);
    await user.click(screen.getByRole('button', { name: /remover/i }));
    expect(screen.queryByRole('button', { name: /ações do exercício supino reto/i })).not.toBeInTheDocument();
  });

  it('shows inline exercise template form in edit mode when edit exercise is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /criar novo treino único/i }));

    await user.selectOptions(screen.getByLabelText(/selecionar exercício existente/i), '20');
    await user.click(screen.getByRole('button', { name: /adicionar exercício ao treino/i }));

    await user.click(screen.getByRole('button', { name: /ações do exercício supino reto/i }));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));

    expect(screen.getByTestId('exercise-template-form')).toBeInTheDocument();
    expect(screen.getByTestId('editing-exercise-id')).toHaveTextContent('20');
  });

  it('shows "Editar exercício" title when editing exercise inline', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /criar novo treino único/i }));

    await user.selectOptions(screen.getByLabelText(/selecionar exercício existente/i), '20');
    await user.click(screen.getByRole('button', { name: /adicionar exercício ao treino/i }));

    await user.click(screen.getByRole('button', { name: /ações do exercício supino reto/i }));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));

    expect(screen.getByText('Editar exercício')).toBeInTheDocument();
  });

  it('refreshes exercise templates after editing without duplicating IDs in training template modal', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /criar novo treino único/i }));

    await user.selectOptions(screen.getByLabelText(/selecionar exercício existente/i), '20');
    await user.click(screen.getByRole('button', { name: /adicionar exercício ao treino/i }));

    await user.click(screen.getByRole('button', { name: /ações do exercício supino reto/i }));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));

    const getCallsBefore = api.get.mock.calls.length;
    await user.click(screen.getByRole('button', { name: /simular exercício editado/i }));

    await waitFor(() => {
      const exerciseFetches = api.get.mock.calls.slice(getCallsBefore).filter(
        ([url]) => url === '/trainer/exercise-templates'
      );
      expect(exerciseFetches.length).toBeGreaterThan(0);
    });

    const actionsMenus = screen.getAllByRole('button', { name: /ações do exercício/i });
    expect(actionsMenus).toHaveLength(1);
  });

  it('shows actions menu in training rows', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /selecionar treino único/i }));

    await user.selectOptions(screen.getByLabelText('Treino único'), '10');
    await user.click(screen.getByRole('button', { name: /^adicionar$/i }));

    expect(screen.getByRole('button', { name: /ações do treino treino a/i })).toBeInTheDocument();
  });

  it('opens training template modal in edit mode when edit training is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /selecionar treino único/i }));

    await user.selectOptions(screen.getByLabelText('Treino único'), '10');
    await user.click(screen.getByRole('button', { name: /^adicionar$/i }));

    await user.click(screen.getByRole('button', { name: /ações do treino treino a/i }));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));

    await waitFor(() => {
      expect(screen.getByText('Editar treino único')).toBeInTheDocument();
    });

    expect(api.get).toHaveBeenCalledWith('/trainer/training-templates/10');
    await waitFor(() => {
      expect(screen.getByDisplayValue('Treino A')).toBeInTheDocument();
    });
  });

  it('calls PATCH when saving training template in edit mode', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({ data: { id: 10, name: 'Treino A', category: 'strength' } });
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /selecionar treino único/i }));

    await user.selectOptions(screen.getByLabelText('Treino único'), '10');
    await user.click(screen.getByRole('button', { name: /^adicionar$/i }));

    await user.click(screen.getByRole('button', { name: /ações do treino treino a/i }));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));

    await waitFor(() => screen.getByText('Editar treino único'));
    await waitFor(() => screen.getByDisplayValue('Treino A'));

    const editModal = screen.getByText('Editar treino único').closest('.bottom-sheet');
    await user.click(within(editModal).getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/trainer/training-templates/10', expect.objectContaining({
        name: 'Treino A',
        category: 'strength',
      }));
      expect(mockShowToast).toHaveBeenCalledWith('Treino único atualizado com sucesso!', 'success');
    });
  });

  it('displays exercise templates in training row after adding a training with template', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /selecionar treino único/i }));

    await user.selectOptions(screen.getByLabelText('Treino único'), '10');
    await user.click(screen.getByRole('button', { name: /^adicionar$/i }));

    await waitFor(() => {
      expect(screen.getByText('Supino Reto')).toBeInTheDocument();
      expect(screen.getByText('Corrida')).toBeInTheDocument();
    });
  });

  it('shows view toggle buttons when templates are loaded', async () => {
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));

    expect(screen.getByRole('button', { name: /visualização em cards/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /visualização em lista/i })).toBeInTheDocument();
  });

  it('switches to list view and shows table with template data', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));

    await user.click(screen.getByRole('button', { name: /visualização em lista/i }));

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Modelo Força')).toBeInTheDocument();
  });

  it('switches back to card view from list view', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));

    await user.click(screen.getByRole('button', { name: /visualização em lista/i }));
    expect(screen.getByRole('table')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /visualização em cards/i }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('hides view toggle buttons when form is open', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));

    expect(screen.queryByRole('button', { name: /visualização em cards/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /visualização em lista/i })).not.toBeInTheDocument();
  });

  it('shows exercise preview in add training modal when a training template is selected', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /selecionar treino único/i }));

    expect(screen.queryByText('Supino Reto')).not.toBeInTheDocument();
    expect(screen.queryByText('Corrida')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Treino único'), '10');

    await waitFor(() => {
      expect(screen.getByText('Supino Reto')).toBeInTheDocument();
      expect(screen.getByText('Corrida')).toBeInTheDocument();
    });

    expect(api.get).toHaveBeenCalledWith('/trainer/training-templates/10');
  });

  it('does not show exercise preview in add training modal before a template is selected', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /selecionar treino único/i }));

    expect(screen.queryByText('Supino Reto')).not.toBeInTheDocument();
    expect(screen.queryByText('Corrida')).not.toBeInTheDocument();
  });
});
