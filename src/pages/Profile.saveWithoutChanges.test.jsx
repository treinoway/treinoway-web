import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { renderWithRouter, screen, waitFor } from '../test/test-utils';
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

const OLD_EMPTY_SAVE_MESSAGE = 'Preencha ao menos um campo para salvar.';
const AVATAR_SUCCESS_MESSAGE = 'Foto atualizada com sucesso!';
const AVATAR_URL = 'https://cdn.example.com/ana.png';

const mockShowToast = vi.fn();
const mockUpdateUser = vi.fn();
const mockRefreshUser = vi.fn();
const mockLogout = vi.fn();

const savedUser = {
  id: 1,
  email: 'ana@example.com',
  firstName: 'Ana',
  lastName: 'Souza',
  gender: 'female',
  birthDate: '1990-05-15T00:00:00.000Z',
};

// Makes useAuth return the given profile as the saved user.
const mockAuthUser = (user) => {
  vi.mocked(useAuth).mockReturnValue({
    user,
    updateUser: mockUpdateUser,
    refreshUser: mockRefreshUser,
    hasRole: () => false,
    logout: mockLogout,
    isAdmin: false,
  });
};

// Exposes the current URL to assertions.
const LocationProbe = () => {
  const location = useLocation();
  return <output aria-label="location">{`${location.pathname}${location.search}`}</output>;
};

// Renders the page next to a location probe at the given route.
const renderProfile = (route = '/profile') => renderWithRouter(
  <>
    <Profile />
    <LocationProbe />
  </>,
  { route },
);

// Builds a valid profile photo file.
const buildPhoto = () => new File(['(binary)'], 'ana.png', { type: 'image/png' });

// Asserts the page is back on the read view.
const expectReadView = async () => {
  expect(await screen.findByRole('button', { name: 'Editar' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^salvar$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
};

// Asserts no error toast (and never the removed message) was shown.
const expectNoErrorToast = () => {
  expect(mockShowToast).not.toHaveBeenCalledWith(expect.anything(), 'error');
  expect(mockShowToast).not.toHaveBeenCalledWith(OLD_EMPTY_SAVE_MESSAGE, expect.anything());
  expect(screen.queryByText(OLD_EMPTY_SAVE_MESSAGE)).not.toBeInTheDocument();
};

describe('Profile save without changes (criterion 40)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockRefreshUser.mockResolvedValue(null);
    // why: the real AuthContext re-renders consumers with the updated user after updateUser.
    mockUpdateUser.mockImplementation((next) => mockAuthUser(next));
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    mockAuthUser(savedUser);
  });

  describe('nothing changed', () => {
    it('leaves edit mode without any toast and without calling PATCH', async () => {
      const user = userEvent.setup();
      renderProfile();

      await user.click(screen.getByRole('button', { name: 'Editar' }));
      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await expectReadView();
      expectNoErrorToast();
      expect(mockShowToast).not.toHaveBeenCalled();
      expect(api.patch).not.toHaveBeenCalled();
    });

    it('does the same for a profile with every optional field empty', async () => {
      const user = userEvent.setup();
      mockAuthUser({ id: 1, email: 'ana@example.com' });
      renderProfile();

      await user.click(screen.getByRole('button', { name: 'Editar' }));
      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await expectReadView();
      expectNoErrorToast();
      expect(mockShowToast).not.toHaveBeenCalled();
      expect(api.patch).not.toHaveBeenCalled();
    });

    it('treats a field typed back to its saved value as unchanged', async () => {
      const user = userEvent.setup();
      renderProfile();

      await user.click(screen.getByRole('button', { name: 'Editar' }));
      const lastName = screen.getByLabelText('Sobrenome');
      await user.clear(lastName);
      await user.type(lastName, 'Souza');
      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await expectReadView();
      expectNoErrorToast();
      expect(api.patch).not.toHaveBeenCalled();
    });
  });

  describe('photo uploaded in the edit session, no other change', () => {
    it('leaves edit mode with the avatar success toast as the only toast and no PATCH', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: { avatarUrl: AVATAR_URL } });
      renderProfile();

      await user.click(screen.getByRole('button', { name: 'Editar' }));
      await user.upload(screen.getByLabelText('Foto de perfil'), buildPhoto());
      await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith(AVATAR_SUCCESS_MESSAGE, 'success'));
      expect(api.post).toHaveBeenCalledWith('/me/avatar', expect.any(FormData), expect.anything());

      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await expectReadView();
      expectNoErrorToast();
      expect(mockShowToast.mock.calls).toEqual([[AVATAR_SUCCESS_MESSAGE, 'success']]);
      expect(api.patch).not.toHaveBeenCalled();
      expect(screen.getByRole('img', { name: 'Foto de perfil' })).toHaveAttribute('src', AVATAR_URL);
    });
  });

  describe('edit query params', () => {
    it('drops edit from the URL after a save with nothing changed', async () => {
      const user = userEvent.setup();
      renderProfile('/profile?edit=1');

      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => expect(screen.getByRole('status', { name: 'location' })).toHaveTextContent(/^\/profile$/));
      await expectReadView();
      expectNoErrorToast();
      expect(api.patch).not.toHaveBeenCalled();
    });

    it('drops edit and focus but keeps unrelated params', async () => {
      const user = userEvent.setup();
      renderProfile('/profile?edit=1&focus=missing&from=onboarding');

      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => {
        expect(screen.getByRole('status', { name: 'location' })).toHaveTextContent(/^\/profile\?from=onboarding$/);
      });
      await expectReadView();
    });

    it('drops edit after uploading a photo and saving with no other change', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: { avatarUrl: AVATAR_URL } });
      renderProfile('/profile?edit=1&focus=missing');

      await user.upload(screen.getByLabelText('Foto de perfil'), buildPhoto());
      await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith(AVATAR_SUCCESS_MESSAGE, 'success'));
      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => expect(screen.getByRole('status', { name: 'location' })).toHaveTextContent(/^\/profile$/));
      await expectReadView();
      expect(mockShowToast.mock.calls).toEqual([[AVATAR_SUCCESS_MESSAGE, 'success']]);
      expect(api.patch).not.toHaveBeenCalled();
    });
  });

  describe('fields changed (unchanged behaviour)', () => {
    it('still sends PATCH /me/profile with only the changed field and shows the success toast', async () => {
      const user = userEvent.setup();
      api.patch.mockResolvedValue({ data: { ...savedUser, lastName: 'Lima' } });
      renderProfile('/profile?edit=1');

      const lastName = screen.getByLabelText('Sobrenome');
      await user.clear(lastName);
      await user.type(lastName, 'Lima');
      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/me/profile', { lastName: 'Lima' }));
      await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Perfil atualizado com sucesso!', 'success'));
      await expectReadView();
      expectNoErrorToast();
    });

    it('still sends the changed field after a photo upload in the same edit session', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: { avatarUrl: AVATAR_URL } });
      api.patch.mockResolvedValue({ data: { ...savedUser, avatarUrl: AVATAR_URL, lastName: 'Lima' } });
      renderProfile('/profile?edit=1');

      await user.upload(screen.getByLabelText('Foto de perfil'), buildPhoto());
      await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith(AVATAR_SUCCESS_MESSAGE, 'success'));
      const lastName = screen.getByLabelText('Sobrenome');
      await user.clear(lastName);
      await user.type(lastName, 'Lima');
      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/me/profile', { lastName: 'Lima' }));
      await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Perfil atualizado com sucesso!', 'success'));
      expectNoErrorToast();
    });

    it('keeps the form open with an error toast when the PATCH fails', async () => {
      const user = userEvent.setup();
      api.patch.mockRejectedValue({ userMessage: 'Erro interno do servidor.' });
      renderProfile('/profile?edit=1');

      const lastName = screen.getByLabelText('Sobrenome');
      await user.clear(lastName);
      await user.type(lastName, 'Lima');
      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Erro interno do servidor.', 'error'));
      expect(screen.getByRole('button', { name: /^salvar$/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    });
  });
});
