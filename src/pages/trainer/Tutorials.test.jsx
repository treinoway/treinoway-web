import userEvent from '@testing-library/user-event';
import { renderWithRouter, screen, waitFor, within } from '../../test/test-utils';
import Tutorials from './Tutorials';
import { listTutorials } from '../../api/tutorials';

vi.mock('../../api/tutorials', () => ({
  listTutorials: vi.fn(),
}));

const baseTutorial = {
  description: null,
  videoKey: null,
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
};

const youtubeTutorial = {
  ...baseTutorial,
  id: 'yt',
  title: 'Boas-vindas',
  description: 'Primeiros passos na plataforma',
  videoSource: 'link',
  videoUrl: 'https://www.youtube.com/watch?v=abc123XYZ_-',
  order: 0,
};
const uploadTutorial = {
  ...baseTutorial,
  id: 'up',
  title: 'Criando rotinas',
  videoSource: 'upload',
  videoUrl: 'https://cdn.example/signed/rotinas.mp4?sig=1',
  order: 1,
};
const directLinkTutorial = {
  ...baseTutorial,
  id: 'direct',
  title: 'Arquivo direto',
  videoSource: 'link',
  videoUrl: 'https://files.example.com/videos/aula.mp4?token=1',
  order: 2,
};
const otherLinkTutorial = {
  ...baseTutorial,
  id: 'other',
  title: 'Vídeo externo',
  videoSource: 'link',
  videoUrl: 'https://vimeo.com/123456',
  order: 3,
};
const allTutorials = [youtubeTutorial, uploadTutorial, directLinkTutorial, otherLinkTutorial];

// Clicks a tutorial card and returns the player dialog.
const openTutorial = async (user, title) => {
  await user.click(await screen.findByRole('button', { name: new RegExp(title) }));
  return screen.findByRole('dialog', { name: title });
};

describe('Tutorials (trainer)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listTutorials.mockResolvedValue({ items: allTutorials });
  });

  it('renders the page heading and a card per tutorial with title and description', async () => {
    renderWithRouter(<Tutorials />);

    expect(screen.getByRole('heading', { name: 'Como usar' })).toBeInTheDocument();
    expect(await screen.findByText('Boas-vindas')).toBeInTheDocument();
    expect(screen.getByText('Primeiros passos na plataforma')).toBeInTheDocument();
    expect(screen.getByText('Criando rotinas')).toBeInTheDocument();
    expect(screen.getByText('Arquivo direto')).toBeInTheDocument();
    expect(screen.getByText('Vídeo externo')).toBeInTheDocument();
    expect(listTutorials).toHaveBeenCalled();
  });

  it('shows the empty state when there are no tutorials', async () => {
    listTutorials.mockResolvedValue({ items: [] });
    renderWithRouter(<Tutorials />);

    expect(await screen.findByText(/nenhum tutorial/i)).toBeInTheDocument();
  });

  it('shows the API userMessage when loading fails', async () => {
    listTutorials.mockRejectedValue({ userMessage: 'Falha de rede' });
    renderWithRouter(<Tutorials />);

    expect(await screen.findByText('Falha de rede')).toBeInTheDocument();
  });

  it('does not open any dialog before a card is clicked', async () => {
    renderWithRouter(<Tutorials />);
    await screen.findByText('Boas-vindas');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('plays a YouTube link in an embedded iframe', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Tutorials />);

    const dialog = await openTutorial(user, 'Boas-vindas');

    const iframe = within(dialog).getByTitle('Boas-vindas');
    expect(iframe.tagName).toBe('IFRAME');
    expect(iframe.getAttribute('src')).toMatch(/^https:\/\/www\.youtube(-nocookie)?\.com\/embed\/abc123XYZ_-/);
    expect(dialog.querySelector('video')).toBeNull();
  });

  it('plays an uploaded video in a <video> with controls and the videoUrl as source', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Tutorials />);

    const dialog = await openTutorial(user, 'Criando rotinas');

    const video = dialog.querySelector('video');
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute('src', 'https://cdn.example/signed/rotinas.mp4?sig=1');
    expect(video).toHaveAttribute('controls');
    expect(dialog.querySelector('iframe')).toBeNull();
  });

  it('plays a non-YouTube link that points to a direct video file in a <video>', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Tutorials />);

    const dialog = await openTutorial(user, 'Arquivo direto');

    const video = dialog.querySelector('video');
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute('src', 'https://files.example.com/videos/aula.mp4?token=1');
    expect(video).toHaveAttribute('controls');
    expect(within(dialog).queryByRole('link', { name: 'Abrir vídeo' })).not.toBeInTheDocument();
  });

  it('offers an external Abrir vídeo link for any other link', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Tutorials />);

    const dialog = await openTutorial(user, 'Vídeo externo');

    const link = within(dialog).getByRole('link', { name: 'Abrir vídeo' });
    expect(link).toHaveAttribute('href', 'https://vimeo.com/123456');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toMatch(/noopener/);
    expect(dialog.querySelector('video')).toBeNull();
    expect(dialog.querySelector('iframe')).toBeNull();
  });

  it('closes the player modal with the Fechar button', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Tutorials />);

    const dialog = await openTutorial(user, 'Criando rotinas');
    await user.click(within(dialog).getByRole('button', { name: 'Fechar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows the tutorial description inside the player modal', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Tutorials />);

    const dialog = await openTutorial(user, 'Boas-vindas');

    expect(within(dialog).getByText('Primeiros passos na plataforma')).toBeInTheDocument();
  });
});
