import { fireEvent, renderWithRouter, screen } from '../../test/test-utils';
import Tutorials from './Tutorials';
import { listTutorials } from '../../api/tutorials';

vi.mock('../../api/tutorials', () => ({
  listTutorials: vi.fn(),
}));

const base = { description: null, videoKey: null, order: 0 };
const tutorials = [
  { ...base, id: 'yt', title: 'Boas-vindas', videoSource: 'link', videoUrl: 'https://www.youtube.com/watch?v=abc123XYZ_-' },
  { ...base, id: 'up', title: 'Criando rotinas', videoSource: 'upload', videoUrl: 'https://cdn.example/signed/rotinas.mp4?sig=1' },
  { ...base, id: 'direct', title: 'Arquivo direto', videoSource: 'link', videoUrl: 'https://files.example.com/aula.webm' },
  { ...base, id: 'other', title: 'Vídeo externo', videoSource: 'link', videoUrl: 'https://vimeo.com/123456' },
];

// Returns the card button for a tutorial title.
const getCard = (title) => screen.getByRole('button', { name: new RegExp(title) });

describe('Tutorials card thumbnails', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    listTutorials.mockResolvedValue({ items: tutorials });
    renderWithRouter(<Tutorials />);
    await screen.findByRole('button', { name: /Boas-vindas/ });
  });

  it('renders a hidden first-frame video for upload cards', () => {
    const video = getCard('Criando rotinas').querySelector('video');
    expect(video).toHaveAttribute('src', 'https://cdn.example/signed/rotinas.mp4?sig=1#t=0.1');
    expect(video).toHaveAttribute('preload', 'metadata');
    expect(video).toHaveAttribute('aria-hidden', 'true');
    expect(video).toHaveAttribute('tabindex', '-1');
    expect(video).not.toHaveAttribute('controls');
    expect(video.muted).toBe(true);
  });

  it('renders the video frame for direct-file links', () => {
    const video = getCard('Arquivo direto').querySelector('video');
    expect(video).toHaveAttribute('src', 'https://files.example.com/aula.webm#t=0.1');
    expect(video).toHaveAttribute('preload', 'metadata');
  });

  it('keeps the image thumbnail for YouTube cards', () => {
    const card = getCard('Boas-vindas');
    expect(card.querySelector('img')).toBeInTheDocument();
    expect(card.querySelector('video')).not.toBeInTheDocument();
  });

  it('keeps the placeholder for non-file links', () => {
    const card = getCard('Vídeo externo');
    expect(card.querySelector('video')).not.toBeInTheDocument();
    expect(card.querySelector('img')).not.toBeInTheDocument();
  });

  it('falls back to the placeholder when the video errors', () => {
    const card = getCard('Criando rotinas');
    fireEvent.error(card.querySelector('video'));
    expect(card.querySelector('video')).not.toBeInTheDocument();
    expect(card).not.toHaveAttribute('title');
  });
});
