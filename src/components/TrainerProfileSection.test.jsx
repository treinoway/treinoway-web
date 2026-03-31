import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import TrainerProfileSection from './TrainerProfileSection';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

vi.mock('../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();

const mockTrainerData = {
  bio: 'Treinador experiente com 10 anos de atuação.',
  serviceMode: 'HYBRID',
  instagram: '@trainer',
  facebook: 'trainer.fb',
  whatsapp: '+5511999999999',
};

describe('TrainerProfileSection', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockResolvedValue({ data: mockTrainerData });
    api.patch.mockReset();
  });

  it('shows loading while profile is being fetched', async () => {
    let resolveProfile;
    const profilePromise = new Promise((resolve) => {
      resolveProfile = resolve;
    });
    api.get.mockReturnValue(profilePromise);

    renderWithRouter(<TrainerProfileSection />);

    expect(screen.getByText('Carregando...')).toBeInTheDocument();

    resolveProfile({ data: mockTrainerData });

    await waitFor(() => {
      expect(screen.getByText('Informações do Treinador')).toBeInTheDocument();
    });
  });

  it('displays trainer bio in styled bio block after loading', async () => {
    renderWithRouter(<TrainerProfileSection />);

    await waitFor(() => {
      expect(screen.getByText('Treinador experiente com 10 anos de atuação.')).toBeInTheDocument();
    });
  });

  // Tweak 4: Service mode badge in header
  it('displays service mode as a badge in the header', async () => {
    renderWithRouter(<TrainerProfileSection />);

    await waitFor(() => {
      const badge = screen.getByText('Híbrido');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('badge');
    });
  });

  // Tweak 4: Badge classes by mode
  it('renders ONLINE mode as badge-blue', async () => {
    api.get.mockResolvedValue({
      data: { ...mockTrainerData, serviceMode: 'ONLINE' },
    });

    renderWithRouter(<TrainerProfileSection />);

    await waitFor(() => {
      const badge = screen.getByText('Online');
      expect(badge.className).toContain('badge-blue');
    });
  });

  it('renders IN_PERSON mode as badge-green', async () => {
    api.get.mockResolvedValue({
      data: { ...mockTrainerData, serviceMode: 'IN_PERSON' },
    });

    renderWithRouter(<TrainerProfileSection />);

    await waitFor(() => {
      const badge = screen.getByText('Presencial');
      expect(badge.className).toContain('badge-green');
    });
  });

  it('does not render its own h1 page title', async () => {
    renderWithRouter(<TrainerProfileSection />);

    await waitFor(() => {
      expect(screen.getByText('Informações do Treinador')).toBeInTheDocument();
    });

    expect(screen.queryByText('Perfil do Treinador')).not.toBeInTheDocument();
  });

  // Tweak 2: Empty fields hidden, summary shown
  it('hides empty social fields and shows empty count', async () => {
    api.get.mockResolvedValue({
      data: { bio: '', serviceMode: 'ONLINE', instagram: '', facebook: '', whatsapp: '' },
    });

    renderWithRouter(<TrainerProfileSection />);

    await waitFor(() => {
      // Should NOT show "Não informado" for individual fields
      expect(screen.queryAllByText('Não informado').length).toBe(0);
      // Should show empty fields summary
      expect(screen.getByText(/campos não preenchidos/)).toBeInTheDocument();
    });
  });

  // Tweak 9: Bio placeholder when empty
  it('shows bio placeholder when bio is empty', async () => {
    api.get.mockResolvedValue({
      data: { bio: '', serviceMode: 'ONLINE', instagram: '', facebook: '', whatsapp: '' },
    });

    renderWithRouter(<TrainerProfileSection />);

    await waitFor(() => {
      expect(screen.getByText('Adicione uma bio para seus alunos conhecerem você')).toBeInTheDocument();
    });
  });

  it('shows Edit button in view mode', async () => {
    renderWithRouter(<TrainerProfileSection />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^editar$/i })).toBeInTheDocument();
    });
  });

  it('switches to edit mode and shows form inputs', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainerProfileSection />);

    await waitFor(() => screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));

    expect(screen.getByRole('button', { name: /^salvar$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  it('pre-fills edit form with existing trainer data', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainerProfileSection />);

    await waitFor(() => screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));

    expect(screen.getByDisplayValue('Treinador experiente com 10 anos de atuação.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('@trainer')).toBeInTheDocument();
  });

  it('returns to view mode and restores data when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainerProfileSection />);

    await waitFor(() => screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));

    const bioTextarea = screen.getByDisplayValue('Treinador experiente com 10 anos de atuação.');
    await user.clear(bioTextarea);
    await user.type(bioTextarea, 'Nova bio');

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(screen.queryByRole('button', { name: /^salvar$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^editar$/i })).toBeInTheDocument();
    expect(screen.getByText('Treinador experiente com 10 anos de atuação.')).toBeInTheDocument();
  });

  it('disables inputs during loading', async () => {
    const user = userEvent.setup();
    let resolveUpdate;
    api.patch.mockReturnValue(new Promise((resolve) => { resolveUpdate = resolve; }));

    renderWithRouter(<TrainerProfileSection />);

    await waitFor(() => screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    expect(screen.getByRole('button', { name: /salvando/i })).toBeDisabled();

    resolveUpdate({ data: mockTrainerData });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^editar$/i })).toBeInTheDocument();
    });
  });

  it('calls PATCH /trainer and shows success toast on submit', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({ data: mockTrainerData });

    renderWithRouter(<TrainerProfileSection />);

    await waitFor(() => screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/trainer', expect.any(Object));
      expect(mockShowToast).toHaveBeenCalledWith(
        'Perfil do treinador atualizado com sucesso!',
        'success'
      );
    });
  });

  it('shows error toast when update fails', async () => {
    const user = userEvent.setup();
    api.patch.mockRejectedValue({
      userMessage: 'Erro ao atualizar.',
      response: { status: 500 },
    });

    renderWithRouter(<TrainerProfileSection />);

    await waitFor(() => screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Erro ao atualizar.', 'error');
    });
  });

  // Tweak 8: Social media in separate sub-section
  it('renders social media under "Redes Sociais e Contato" sub-section', async () => {
    renderWithRouter(<TrainerProfileSection />);

    await waitFor(() => {
      expect(screen.getByText('Redes Sociais e Contato')).toBeInTheDocument();
    });

    expect(screen.getByText('@trainer')).toBeInTheDocument();
    expect(screen.getByText('trainer.fb')).toBeInTheDocument();
  });

  // Tweak 6: Section completeness indicator
  it('shows check icon when all social fields are filled', async () => {
    renderWithRouter(<TrainerProfileSection />);

    await waitFor(() => {
      expect(screen.getByLabelText('Seção completa')).toBeInTheDocument();
    });
  });

  it('shows "Incompleto" when social fields are partially empty', async () => {
    api.get.mockResolvedValue({
      data: { ...mockTrainerData, facebook: '', whatsapp: '' },
    });

    renderWithRouter(<TrainerProfileSection />);

    await waitFor(() => {
      expect(screen.getByText('Incompleto')).toBeInTheDocument();
    });
  });

  // Tweak 1: Stacked info layout
  it('renders social info in stacked layout', async () => {
    renderWithRouter(<TrainerProfileSection />);

    await waitFor(() => {
      // Labels should exist as block elements (not inline)
      expect(screen.getByText('Instagram')).toBeInTheDocument();
      expect(screen.getByText('@trainer')).toBeInTheDocument();
    });
  });

  // Tweak 2: Only filled fields shown
  it('shows only filled social fields and empty count for others', async () => {
    api.get.mockResolvedValue({
      data: { ...mockTrainerData, facebook: '', whatsapp: '' },
    });

    renderWithRouter(<TrainerProfileSection />);

    await waitFor(() => {
      expect(screen.getByText('@trainer')).toBeInTheDocument();
      // Facebook and WhatsApp should not appear as info items
      expect(screen.queryByText('trainer.fb')).not.toBeInTheDocument();
      // Empty count shown
      expect(screen.getByText(/campo.*não preenchido/)).toBeInTheDocument();
    });
  });
});
