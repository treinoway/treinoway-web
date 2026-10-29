import { fireEvent, renderWithRouter, screen } from '../../test/test-utils';
import Tutorials from './Tutorials';
import { listTutorials } from '../../api/tutorials';
import { formatDuration } from '../../utils/tutorialMedia';

vi.mock('../../api/tutorials', () => ({
  listTutorials: vi.fn(),
}));

const base = { videoKey: null, order: 0 };
const tutorials = [
  { ...base, id: 'yt', title: 'Boas-vindas', description: 'Primeiros passos', videoSource: 'link', videoUrl: 'https://www.youtube.com/watch?v=abc123XYZ_-' },
  { ...base, id: 'up', title: 'Criando rotinas', description: null, videoSource: 'upload', videoUrl: 'https://cdn.example/r.mp4' },
  { ...base, id: 'other', title: 'Vídeo externo', description: null, videoSource: 'link', videoUrl: 'https://vimeo.com/123456' },
];

describe('Tutorials page layout', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    listTutorials.mockResolvedValue({ items: tutorials });
    renderWithRouter(<Tutorials />);
    await screen.findByRole('button', { name: /Boas-vindas/ });
  });

  it('shows the heading and subtitle', () => {
    expect(screen.getByRole('heading', { level: 1, name: 'Como usar' })).toBeInTheDocument();
    expect(screen.getByText('Vídeos curtos para você aproveitar o máximo do Teufit.')).toBeInTheDocument();
  });

  it('shows source badges per card', () => {
    expect(screen.getByRole('button', { name: /Boas-vindas/ })).toHaveTextContent('YouTube');
    expect(screen.getByRole('button', { name: /Criando rotinas/ })).toHaveTextContent('Vídeo');
    expect(screen.getByRole('button', { name: /Vídeo externo/ })).toHaveTextContent('Link');
  });

  it('shows the description only when present', () => {
    expect(screen.getByRole('button', { name: /Boas-vindas/ })).toHaveTextContent('Primeiros passos');
    expect(screen.getByRole('button', { name: /Criando rotinas/ })).not.toHaveTextContent('null');
  });

  it('shows the duration once the video metadata loads', () => {
    const card = screen.getByRole('button', { name: /Criando rotinas/ });
    expect(card).not.toHaveTextContent('1:05');
    const video = card.querySelector('video');
    Object.defineProperty(video, 'duration', { value: 65, configurable: true });
    fireEvent.loadedMetadata(video);
    expect(card).toHaveTextContent('1:05');
  });

  it('omits the duration when it is unknown', () => {
    const video = screen.getByRole('button', { name: /Criando rotinas/ }).querySelector('video');
    Object.defineProperty(video, 'duration', { value: NaN, configurable: true });
    fireEvent.loadedMetadata(video);
    expect(screen.getByRole('button', { name: /Criando rotinas/ })).not.toHaveTextContent(/\d:\d\d/);
  });
});

describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3725)).toBe('1:02:05');
    expect(formatDuration(0)).toBeNull();
    expect(formatDuration(Infinity)).toBeNull();
    expect(formatDuration(undefined)).toBeNull();
  });
});
