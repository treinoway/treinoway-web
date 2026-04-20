import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import NutritionistProfileSection from './NutritionistProfileSection';
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

const mockNutritionistData = {
  professionalDocument: 'CRN-3 12345',
  clinicName: 'Clínica Saúde Plena',
  serviceMode: 'online',
  serviceModeLabel: 'Online',
  notes: 'Emagrecimento, nutrição esportiva',
  profileCompletedAt: '2024-01-01T00:00:00.000Z',
};

describe('NutritionistProfileSection', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockResolvedValue({ data: mockNutritionistData });
    api.patch.mockReset();
  });

  it('shows loading while profile is being fetched', async () => {
    let resolveProfile;
    const profilePromise = new Promise((resolve) => {
      resolveProfile = resolve;
    });
    api.get.mockReturnValue(profilePromise);

    renderWithRouter(<NutritionistProfileSection />);

    expect(screen.getByText('Carregando...')).toBeInTheDocument();

    resolveProfile({ data: mockNutritionistData });

    await waitFor(() => {
      expect(screen.getByText('Informações do Nutricionista')).toBeInTheDocument();
    });
  });

  it('renders the card title after loading', async () => {
    renderWithRouter(<NutritionistProfileSection />);

    await waitFor(() => {
      expect(screen.getByText('Informações do Nutricionista')).toBeInTheDocument();
    });
  });

  it('displays service mode as a badge in the header', async () => {
    renderWithRouter(<NutritionistProfileSection />);

    await waitFor(() => {
      const badges = screen.getAllByText('Online');
      const headerBadge = badges.find((el) => el.className.includes('badge'));
      expect(headerBadge).toBeInTheDocument();
      expect(headerBadge.className).toContain('badge');
    });
  });

  it('renders in_person mode as badge-green', async () => {
    api.get.mockResolvedValue({
      data: { ...mockNutritionistData, serviceMode: 'in_person', serviceModeLabel: 'Presencial' },
    });

    renderWithRouter(<NutritionistProfileSection />);

    await waitFor(() => {
      const badges = screen.getAllByText('Presencial');
      const headerBadge = badges.find((el) => el.className.includes('badge'));
      expect(headerBadge).toBeDefined();
      expect(headerBadge.className).toContain('badge-green');
    });
  });

  it('renders online mode as badge-blue', async () => {
    renderWithRouter(<NutritionistProfileSection />);

    await waitFor(() => {
      const badges = screen.getAllByText('Online');
      const headerBadge = badges.find((el) => el.className.includes('badge'));
      expect(headerBadge).toBeDefined();
      expect(headerBadge.className).toContain('badge-blue');
    });
  });

  it('shows check icon when profile is complete', async () => {
    renderWithRouter(<NutritionistProfileSection />);

    await waitFor(() => {
      expect(screen.getByLabelText('Seção completa')).toBeInTheDocument();
    });
  });

  it('shows "Incompleto" when profileCompletedAt is null', async () => {
    api.get.mockResolvedValue({
      data: { ...mockNutritionistData, profileCompletedAt: null },
    });

    renderWithRouter(<NutritionistProfileSection />);

    await waitFor(() => {
      expect(screen.getByText('Incompleto')).toBeInTheDocument();
    });
  });

  it('renders professional data in view mode', async () => {
    renderWithRouter(<NutritionistProfileSection />);

    await waitFor(() => {
      expect(screen.getByText('CRN-3 12345')).toBeInTheDocument();
      expect(screen.getByText('Clínica Saúde Plena')).toBeInTheDocument();
      expect(screen.getByText('Emagrecimento, nutrição esportiva')).toBeInTheDocument();
    });
  });

  it('shows Edit button in view mode', async () => {
    renderWithRouter(<NutritionistProfileSection />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^editar$/i })).toBeInTheDocument();
    });
  });

  it('switches to edit mode and shows form inputs', async () => {
    const user = userEvent.setup();
    renderWithRouter(<NutritionistProfileSection />);

    await waitFor(() => screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));

    expect(screen.getByRole('button', { name: /^salvar$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  it('pre-fills edit form with existing nutritionist data', async () => {
    const user = userEvent.setup();
    renderWithRouter(<NutritionistProfileSection />);

    await waitFor(() => screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));

    expect(screen.getByDisplayValue('CRN-3 12345')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Clínica Saúde Plena')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Emagrecimento, nutrição esportiva')).toBeInTheDocument();
  });

  it('returns to view mode and restores data when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<NutritionistProfileSection />);

    await waitFor(() => screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));

    const crnInput = screen.getByDisplayValue('CRN-3 12345');
    await user.clear(crnInput);
    await user.type(crnInput, 'CRN-1 99999');

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(screen.queryByRole('button', { name: /^salvar$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^editar$/i })).toBeInTheDocument();
    expect(screen.getByText('CRN-3 12345')).toBeInTheDocument();
  });

  it('disables inputs during loading', async () => {
    const user = userEvent.setup();
    let resolveUpdate;
    api.patch.mockReturnValue(new Promise((resolve) => { resolveUpdate = resolve; }));

    renderWithRouter(<NutritionistProfileSection />);

    await waitFor(() => screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    expect(screen.getByRole('button', { name: /salvando/i })).toBeDisabled();

    resolveUpdate({ data: mockNutritionistData });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^editar$/i })).toBeInTheDocument();
    });
  });

  it('calls PATCH /nutritionist with nested body and shows success toast on submit', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({ data: mockNutritionistData });

    renderWithRouter(<NutritionistProfileSection />);

    await waitFor(() => screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/nutritionist', {
        nutritionist: {
          professionalDocument: 'CRN-3 12345',
          clinicName: 'Clínica Saúde Plena',
          serviceMode: 'online',
          notes: 'Emagrecimento, nutrição esportiva',
        },
      });
      expect(mockShowToast).toHaveBeenCalledWith('Dados profissionais atualizados!', 'success');
    });
  });

  it('shows error toast when update fails', async () => {
    const user = userEvent.setup();
    api.patch.mockRejectedValue({
      userMessage: 'Erro ao atualizar.',
      response: { status: 500 },
    });

    renderWithRouter(<NutritionistProfileSection />);

    await waitFor(() => screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Erro ao atualizar.', 'error');
    });
  });

  it('hides the component silently on 403', async () => {
    api.get.mockRejectedValue({
      response: { status: 403 },
    });

    renderWithRouter(<NutritionistProfileSection />);

    await waitFor(() => {
      expect(screen.queryByText('Informações do Nutricionista')).not.toBeInTheDocument();
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
    });
  });

  it('shows empty count when all fields are missing', async () => {
    api.get.mockResolvedValue({
      data: {
        professionalDocument: null,
        clinicName: null,
        serviceMode: null,
        notes: null,
        profileCompletedAt: null,
      },
    });

    renderWithRouter(<NutritionistProfileSection />);

    await waitFor(() => {
      expect(screen.getByText(/campos não preenchidos/)).toBeInTheDocument();
    });
  });

  it('shows partial empty count when some fields are missing', async () => {
    api.get.mockResolvedValue({
      data: {
        ...mockNutritionistData,
        clinicName: null,
        notes: null,
        profileCompletedAt: null,
      },
    });

    renderWithRouter(<NutritionistProfileSection />);

    await waitFor(() => {
      expect(screen.getByText(/campos não preenchidos/)).toBeInTheDocument();
    });
  });
});
