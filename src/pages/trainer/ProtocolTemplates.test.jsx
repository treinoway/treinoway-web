import { screen, waitFor } from '@testing-library/react';
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

const mockShowToast = vi.fn();

const mockTemplates = [
  {
    id: 1,
    name: 'Modelo Força',
    description: 'Protocolo de força',
    availableWeekDays: ['monday', 'wednesday', 'friday'],
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
      if (url === '/trainer/protocol-templates/1') {
        return Promise.resolve({
          data: {
            ...mockTemplates[0],
            scheduleTemplates: [],
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

    expect(screen.getByText('Modelos de Rotina')).toBeInTheDocument();
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
      expect(screen.getByText('Nenhum modelo de rotina ainda')).toBeInTheDocument();
    });

    expect(screen.getByText(/o que é um modelo\?/i)).toBeInTheDocument();
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

  it('shows the create form when "+ Novo Modelo" is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ novo modelo/i }));

    expect(screen.getByText('Criar Novo Modelo')).toBeInTheDocument();
  });

  it('renders weekday checkboxes in the create form', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ novo modelo/i }));

    expect(screen.getByLabelText('Segunda')).toBeInTheDocument();
    expect(screen.getByLabelText('Terça')).toBeInTheDocument();
    expect(screen.getByLabelText('Sexta')).toBeInTheDocument();
  });

  it('calls POST to create a template on form submission', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 2, name: 'Novo Modelo' } });
    api.get.mockResolvedValue({ data: [...mockTemplates, { id: 2, name: 'Novo Modelo', availableWeekDays: [], defaultDurationWeeks: 12 }] });

    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ novo modelo/i }));

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

  it('populates form with existing data when Edit is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /editar/i }));

    expect(screen.getByText('Editar Modelo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Modelo Força')).toBeInTheDocument();
  });

  it('calls PATCH on save when editing an existing template', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({ data: mockTemplates[0] });

    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /editar/i }));
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/trainer/protocol-templates/1', expect.any(Object));
      expect(mockShowToast).toHaveBeenCalledWith('Modelo atualizado com sucesso!', 'success');
    });
  });

  it('calls DELETE and shows success toast on template delete with custom confirm dialog', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({});

    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /excluir/i }));
    await waitFor(() => screen.getByRole('button', { name: /confirmar/i }));
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/protocol-templates/1');
      expect(mockShowToast).toHaveBeenCalledWith('Modelo excluído com sucesso!', 'success');
    });
  });

  it('does not delete when custom dialog confirmation is cancelled', async () => {
    const user = userEvent.setup();

    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /excluir/i }));
    await waitFor(() => screen.getByRole('button', { name: /cancelar/i }));
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(api.delete).not.toHaveBeenCalled();
  });

  it('hides form on Cancel and returns to list view', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ novo modelo/i }));

    expect(screen.getByText('Criar Novo Modelo')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(screen.queryByText('Criar Novo Modelo')).not.toBeInTheDocument();
  });

  it('adds and removes training rows in template form', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ novo modelo/i }));
    await user.click(screen.getByRole('button', { name: /selecionar existente/i }));

    expect(screen.getByRole('button', { name: /\+ adicionar treino/i })).toBeInTheDocument();
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /remover/i }));
    expect(screen.getByRole('button', { name: /selecionar existente/i })).toBeInTheDocument();
  });

  it('creates training template from inline modal', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 99, name: 'Treino Novo', category: 'strength' } });
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));
    await user.click(screen.getByRole('button', { name: /\+ novo modelo/i }));
    await user.click(screen.getByRole('button', { name: /criar novo modelo de treino/i }));

    await user.type(screen.getByLabelText('Nome', { selector: '#tt-modal-name' }), 'Treino Novo');
    await user.selectOptions(screen.getByLabelText('Categoria'), 'strength');
    await user.click(screen.getByRole('button', { name: /criar modelo de treino/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/training-templates', expect.objectContaining({
        name: 'Treino Novo',
        category: 'strength',
      }));
      expect(mockShowToast).toHaveBeenCalledWith('Modelo de treino criado com sucesso!', 'success');
    });
  });
});
