import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { renderWithRouter } from '../test/test-utils';
import Profile from './Profile';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));
vi.mock('../components/TrainerProfileSection', () => ({ default: () => <div /> }));

const mockShowToast = vi.fn();
const mockUpdateUser = vi.fn();
const incompleteUser = { id: 1, email: 'ana@example.com', roles: ['TRAINER'] };

// Exposes the current URL to assertions.
const LocationProbe = () => {
  const location = useLocation();
  return <output aria-label="location">{`${location.pathname}${location.search}`}</output>;
};

// Renders the page next to a location probe at the given route.
const renderProfile = (route) => renderWithRouter(
  <>
    <Profile />
    <LocationProbe />
  </>,
  { route },
);

describe('Profile review fixes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    vi.mocked(useAuth).mockReturnValue({
      user: incompleteUser,
      updateUser: mockUpdateUser,
      refreshUser: vi.fn().mockResolvedValue(null),
      hasRole: () => false,
      logout: vi.fn(),
      isAdmin: false,
    });
  });

  describe('accessibility of missing-field flags (S4)', () => {
    it('describes the photo button and the name inputs by their error text', () => {
      renderProfile('/profile?edit=1&focus=missing');

      const photoButton = screen.getByRole('button', { name: 'Alterar foto' });
      expect(photoButton).toHaveAttribute('aria-invalid', 'true');
      const photoError = screen.getByText('Adicione uma foto de perfil');
      expect(photoButton).toHaveAttribute('aria-describedby', photoError.id);

      const firstName = screen.getByLabelText('Nome');
      expect(firstName).toHaveAttribute('aria-describedby', screen.getByText('Informe seu nome').id);
      const lastName = screen.getByLabelText('Sobrenome');
      expect(lastName).toHaveAttribute('aria-describedby', screen.getByText('Informe seu sobrenome').id);
    });

    it('adds no error text or descriptions without the focus=missing flag', () => {
      renderProfile('/profile?edit=1');

      expect(screen.getByRole('button', { name: 'Alterar foto' })).not.toHaveAttribute('aria-describedby');
      expect(screen.queryByText('Informe seu nome')).not.toBeInTheDocument();
    });
  });

  describe('client-side avatar validation (S5)', () => {
    it('rejects a file over 5MB without calling the API', async () => {
      const user = userEvent.setup();
      renderProfile('/profile?edit=1');
      const big = new File(['x'], 'big.png', { type: 'image/png' });
      Object.defineProperty(big, 'size', { value: 5 * 1024 * 1024 + 1 });

      await user.upload(screen.getByLabelText('Foto de perfil'), big);

      expect(mockShowToast).toHaveBeenCalledWith('Arquivo muito grande. O tamanho máximo é 5MB.', 'error');
      expect(api.post).not.toHaveBeenCalled();
    });

    it('rejects an unsupported file type without calling the API', async () => {
      const user = userEvent.setup({ applyAccept: false });
      renderProfile('/profile?edit=1');

      await user.upload(screen.getByLabelText('Foto de perfil'), new File(['x'], 'a.gif', { type: 'image/gif' }));

      expect(mockShowToast).toHaveBeenCalledWith('Formato inválido. Use uma imagem JPG, PNG ou WebP.', 'error');
      expect(api.post).not.toHaveBeenCalled();
    });

    it('accepts a file of exactly 5MB', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: { avatarUrl: 'https://cdn.example.com/a.png' } });
      renderProfile('/profile?edit=1');
      const limit = new File(['x'], 'ok.webp', { type: 'image/webp' });
      Object.defineProperty(limit, 'size', { value: 5 * 1024 * 1024 });

      await user.upload(screen.getByLabelText('Foto de perfil'), limit);

      await waitFor(() => expect(api.post).toHaveBeenCalled());
    });
  });

  describe('edit query params (N7)', () => {
    it('drops edit and focus from the URL after a successful save', async () => {
      const user = userEvent.setup();
      api.patch.mockResolvedValue({ data: { ...incompleteUser, firstName: 'Ana' } });
      renderProfile('/profile?edit=1&focus=missing');

      await user.type(screen.getByLabelText('Nome'), 'Ana');
      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => expect(screen.getByRole('status', { name: 'location' })).toHaveTextContent(/^\/profile$/));
    });
  });
});
