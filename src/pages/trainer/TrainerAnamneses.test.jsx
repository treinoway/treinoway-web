import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { render, renderWithRouter, renderWithRoute } from '../../test/test-utils';
import TrainerAnamneses from './TrainerAnamneses';
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

const mockAnamneses = [
  {
    id: 'anamnesis-1',
    title: 'Anamnese Saúde Geral',
    description: 'Questionário de saúde',
    isGeneral: false,
    parentId: null,
    version: 1,
    sections: [{ id: 's1' }, { id: 's2' }],
    updatedAt: '2026-04-08T10:00:00Z',
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'anamnesis-2',
    title: 'Anamnese Geral da Plataforma',
    description: null,
    isGeneral: true,
    parentId: null,
    version: 3,
    sections: [],
    updatedAt: '2026-04-12T10:00:00Z',
    createdAt: '2026-01-01T10:00:00Z',
  },
  {
    id: 'anamnesis-3',
    title: 'Anamnese Derivada',
    description: null,
    isGeneral: false,
    parentId: 'anamnesis-2',
    version: 1,
    sections: [],
    updatedAt: '2026-04-05T10:00:00Z',
    createdAt: '2026-04-05T10:00:00Z',
  },
];

describe('TrainerAnamneses', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReset();
    api.post.mockReset();
    api.patch.mockReset();
    api.delete.mockReset();
  });

  it('shows loading state while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderWithRouter(<TrainerAnamneses />);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('renders page title after loading', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Anamneses' })).toBeInTheDocument();
    });
  });

  it('fetches anamneses from /trainer/anamneses on mount', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/trainer/anamneses');
    });
  });

  it('shows empty state when no anamneses', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Sem anamneses ainda')).toBeInTheDocument();
    });
  });

  it('shows CTA button in empty state that opens the create form', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Sem anamneses ainda')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /criar primeira anamnese/i }));
    expect(screen.getByRole('dialog', { name: 'Nova anamnese' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^nome/i)).toBeInTheDocument();
  });

  it('renders 3 anamneses with correct origin badges', async () => {
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });
    expect(screen.getByText('Anamnese Geral da Plataforma')).toBeInTheDocument();
    expect(screen.getByText('Anamnese Derivada')).toBeInTheDocument();
    expect(screen.getByText('Minha')).toBeInTheDocument();
    expect(screen.getByText('Geral')).toBeInTheDocument();
    expect(screen.getByText('Derivada')).toBeInTheDocument();
  });

  it('filters to only own anamneses when "Meus" chip is clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: /meus/i }));

    expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    expect(screen.getByText('Anamnese Derivada')).toBeInTheDocument();
    expect(screen.queryByText('Anamnese Geral da Plataforma')).not.toBeInTheDocument();
  });

  it('filters to only general anamneses when "Gerais" chip is clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: /gerais/i }));

    expect(screen.getByText('Anamnese Geral da Plataforma')).toBeInTheDocument();
    expect(screen.queryByText('Anamnese Saúde Geral')).not.toBeInTheDocument();
    expect(screen.queryByText('Anamnese Derivada')).not.toBeInTheDocument();
  });

  it('filters rows by search query (case-insensitive)', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });

    await user.type(screen.getByRole('textbox', { name: /buscar anamnese/i }), 'saúde');

    expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    expect(screen.queryByText('Anamnese Geral da Plataforma')).not.toBeInTheDocument();
    expect(screen.queryByText('Anamnese Derivada')).not.toBeInTheDocument();
  });

  it('navigates to anamnesis detail when row is clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRoute(<TrainerAnamneses />, {
      route: '/trainer/anamneses',
      path: '/trainer/anamneses',
    });
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /abrir anamnese saúde geral/i }));

    await waitFor(() => {
      expect(screen.getByTestId('redirected')).toBeInTheDocument();
    });
  });

  it('opens confirm dialog when "Excluir" is clicked via row menu', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Saúde Geral' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(screen.getByText(/excluir "anamnese saúde geral"/i)).toBeInTheDocument();
  });

  it('calls DELETE and shows toast after confirm delete', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    api.delete.mockResolvedValue({});
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Saúde Geral' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/anamneses/anamnesis-1');
      expect(mockShowToast).toHaveBeenCalledWith('Anamnese excluída com sucesso!', 'success');
    });
  });

  it('does not call DELETE when cancel is clicked in confirm dialog', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Saúde Geral' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(api.delete).not.toHaveBeenCalled();
  });

  it('calls fork endpoint and navigates on "Nova versão"', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    api.post.mockResolvedValue({ data: { id: 'forked-id' } });
    renderWithRoute(<TrainerAnamneses />, {
      route: '/trainer/anamneses',
      path: '/trainer/anamneses',
    });
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Saúde Geral' }));
    await user.click(screen.getByRole('button', { name: 'Nova versão' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/anamneses/anamnesis-1/fork');
      expect(mockShowToast).toHaveBeenCalledWith('Nova versão criada com sucesso!', 'success');
    });
    await waitFor(() => {
      expect(screen.getByTestId('redirected')).toBeInTheDocument();
    });
  });

  it('calls copy endpoint and navigates when "Duplicar" is clicked on general anamnesis', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    api.post.mockResolvedValue({ data: { id: 'copied-id' } });
    renderWithRoute(<TrainerAnamneses />, {
      route: '/trainer/anamneses',
      path: '/trainer/anamneses',
    });
    await waitFor(() => {
      expect(screen.getByText('Anamnese Geral da Plataforma')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Geral da Plataforma' }));
    await user.click(screen.getByRole('button', { name: 'Duplicar' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/anamneses/anamnesis-2/copy');
      expect(mockShowToast).toHaveBeenCalledWith('Anamnese copiada com sucesso!', 'success');
    });
    await waitFor(() => {
      expect(screen.getByTestId('redirected')).toBeInTheDocument();
    });
  });

  describe.each([
    ['own', 'Anamnese Saúde Geral'],
    ['general', 'Anamnese Geral da Plataforma'],
  ])('"Enviar para alunos" (%s anamnesis)', (_kind, title) => {
    it('opens the assign screen remembering the list as origin', async () => {
      const user = userEvent.setup();
      api.get.mockResolvedValue({ data: mockAnamneses });
      const AssignProbe = () => <div data-testid="assign-page">{useLocation().state?.from}</div>;
      render(
        <MemoryRouter initialEntries={['/trainer/anamneses']}>
          <Routes>
            <Route path="/trainer/anamneses" element={<TrainerAnamneses />} />
            <Route path="/trainer/anamneses/:anamnesisId/assign" element={<AssignProbe />} />
          </Routes>
        </MemoryRouter>,
      );
      await waitFor(() => expect(screen.getByText(title)).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: `Opções de ${title}` }));
      await user.click(screen.getByRole('button', { name: 'Enviar para alunos' }));

      expect(await screen.findByTestId('assign-page')).toHaveTextContent('/trainer/anamneses');
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  it('submitting create form calls POST and navigates to new anamnesis', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [] });
    api.post.mockResolvedValue({ data: { id: 'new-id' } });
    renderWithRoute(<TrainerAnamneses />, {
      route: '/trainer/anamneses',
      path: '/trainer/anamneses',
    });
    await waitFor(() => {
      expect(screen.queryByText(/carregando/i)).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /criar primeira anamnese/i }));
    await user.type(screen.getByLabelText(/^nome/i), 'Nova Anamnese Teste');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/anamneses',
        expect.objectContaining({ title: 'Nova Anamnese Teste' }),
      );
      expect(mockShowToast).toHaveBeenCalledWith('Anamnese criada com sucesso!', 'success');
    });
    await waitFor(() => {
      expect(screen.getByTestId('redirected')).toBeInTheDocument();
    });
  });

  it('shows the edit form prefilled when "Editar" is clicked via row menu', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Saúde Geral' }));
    await user.click(screen.getByRole('button', { name: 'Editar' }));

    expect(screen.getByRole('dialog', { name: 'Editar anamnese' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Anamnese Saúde Geral')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Questionário de saúde')).toBeInTheDocument();
  });

  it('submits update and shows success toast', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    api.patch.mockResolvedValue({ data: {} });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Saúde Geral' }));
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/trainer/anamneses/anamnesis-1',
        expect.any(Object),
      );
      expect(mockShowToast).toHaveBeenCalledWith('Anamnese atualizada com sucesso!', 'success');
    });
  });

  it('shows an alert with retry when the fetch fails, and recovers on retry', async () => {
    const user = userEvent.setup();
    api.get.mockRejectedValueOnce({ userMessage: 'Erro ao carregar' });
    api.get.mockResolvedValueOnce({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Erro ao carregar');
    expect(screen.queryByRole('button', { name: /nova anamnese/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(await screen.findByText('Anamnese Saúde Geral')).toBeInTheDocument();
  });

  it('shows counts on every filter tab', async () => {
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    expect(await screen.findByRole('tab', { name: /todos \(3\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /meus \(2\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /gerais \(1\)/i })).toBeInTheDocument();
  });

  it('shows the no-results block when the search matches nothing', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await screen.findByText('Anamnese Saúde Geral');

    await user.type(screen.getByRole('textbox', { name: /buscar anamnese/i }), 'zzz');

    expect(screen.getByRole('heading', { name: 'Sem resultados' })).toBeInTheDocument();
  });

  it('hides the header CTA while the library is empty', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<TrainerAnamneses />);
    await screen.findByRole('heading', { name: 'Sem anamneses ainda' });
    expect(screen.queryByRole('button', { name: /nova anamnese/i })).not.toBeInTheDocument();
  });

  it('opens the create modal from the header and closes it on cancel', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await screen.findByText('Anamnese Saúde Geral');

    await user.click(screen.getByRole('button', { name: /nova anamnese/i }));
    expect(screen.getByRole('dialog', { name: 'Nova anamnese' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('keeps the modal open and shows a toast when create fails', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    api.post.mockRejectedValue({ userMessage: 'Falha ao criar' });
    renderWithRouter(<TrainerAnamneses />);
    await screen.findByText('Anamnese Saúde Geral');

    await user.click(screen.getByRole('button', { name: /nova anamnese/i }));
    await user.type(screen.getByLabelText(/^nome/i), 'Teste');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Falha ao criar', 'error'));
    expect(screen.getByRole('dialog', { name: 'Nova anamnese' })).toBeInTheDocument();
  });

  it('closes the modal and refetches after a successful update', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    api.patch.mockResolvedValue({ data: {} });
    renderWithRouter(<TrainerAnamneses />);
    await screen.findByText('Anamnese Saúde Geral');

    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Saúde Geral' }));
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('shows an error toast when delete fails and keeps the row', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    api.delete.mockRejectedValue({ userMessage: 'Anamnese em uso' });
    renderWithRouter(<TrainerAnamneses />);
    await screen.findByText('Anamnese Saúde Geral');

    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Saúde Geral' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Anamnese em uso', 'error'));
    expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
  });

  it('general anamnesis has no "Excluir" option and a disabled checkbox', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await screen.findByText('Anamnese Geral da Plataforma');

    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Geral da Plataforma' }));
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /anamnese geral da plataforma/i })).toBeDisabled();
  });

  it('select-all only selects anamneses the trainer owns', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await screen.findByText('Anamnese Saúde Geral');

    await user.click(screen.getByRole('button', { name: /selecionar todos/i }));

    expect(screen.getByRole('checkbox', { name: /selecionar anamnese saúde geral/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /selecionar anamnese derivada/i })).toBeChecked();
    expect(screen.getByText('2 selecionados')).toBeInTheDocument();
  });

  it('batch-deletes the selected anamneses after confirmation', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    api.delete.mockResolvedValue({});
    renderWithRouter(<TrainerAnamneses />);
    await screen.findByText('Anamnese Saúde Geral');

    await user.click(screen.getByRole('checkbox', { name: /selecionar anamnese saúde geral/i }));
    await user.click(screen.getByRole('checkbox', { name: /selecionar anamnese derivada/i }));
    await user.click(screen.getByRole('button', { name: /excluir selecionados/i }));
    expect(screen.getByText(/excluir 2 anamneses selecionadas/i)).toBeInTheDocument();
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/anamneses/anamnesis-1');
      expect(api.delete).toHaveBeenCalledWith('/trainer/anamneses/anamnesis-3');
      expect(mockShowToast).toHaveBeenCalledWith('2 anamneses excluídas.', 'success');
    });
  });

  it('warns when part of a batch delete fails', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    api.delete.mockImplementation((url) =>
      (url.endsWith('anamnesis-3') ? Promise.reject({ userMessage: 'em uso' }) : Promise.resolve({})));
    renderWithRouter(<TrainerAnamneses />);
    await screen.findByText('Anamnese Saúde Geral');

    await user.click(screen.getByRole('button', { name: /selecionar todos/i }));
    await user.click(screen.getByRole('button', { name: /excluir selecionados/i }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('1 excluída(s), 1 não puderam'), 'warning');
    });
  });

  it('does not offer batch selection on the general-only tab', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await screen.findByText('Anamnese Saúde Geral');

    await user.click(screen.getByRole('tab', { name: /gerais/i }));

    expect(screen.queryByRole('button', { name: /selecionar todos/i })).not.toBeInTheDocument();
  });

  it('shows version badge for every anamnesis', async () => {
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });
    // version badges: v1 (×2 own + derived), v3 (general)
    expect(screen.getByText('v3')).toBeInTheDocument();
    expect(screen.getAllByText('v1').length).toBeGreaterThanOrEqual(2);
  });

  it('general anamnesis does not show "Nova versão" option', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Geral da Plataforma')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Geral da Plataforma' }));
    expect(screen.queryByRole('button', { name: 'Nova versão' })).not.toBeInTheDocument();
  });
});
