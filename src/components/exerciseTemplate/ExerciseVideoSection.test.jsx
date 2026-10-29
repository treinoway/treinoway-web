import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import ExerciseVideoSection from './ExerciseVideoSection';

const VALID_URL = 'https://www.youtube.com/watch?v=abc123XYZ';

const renderSection = (props = {}) => {
  const handlers = { onVideoUrlChange: vi.fn(), onRemoveVideo: vi.fn() };
  render(<ExerciseVideoSection className="section-card" videoUrl="" {...handlers} {...props} />);
  return handlers;
};

describe('ExerciseVideoSection', () => {
  it('shows the empty stage hint and no remove button without a video', () => {
    renderSection();
    expect(screen.getByText(/cole o link do youtube abaixo/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remover vídeo/i })).not.toBeInTheDocument();
  });

  it('shows the thumbnail, then swaps it for the player on play', async () => {
    renderSection({ videoUrl: VALID_URL });
    expect(screen.getByRole('img', { name: /miniatura do vídeo/i })).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: /reproduzir prévia/i }));

    expect(screen.queryByRole('img', { name: /miniatura do vídeo/i })).not.toBeInTheDocument();
    expect(document.querySelector('iframe').src).toContain('youtube.com/embed/abc123XYZ');
  });

  it('flags a non-YouTube link', () => {
    renderSection({ videoUrl: 'https://vimeo.com/1' });
    expect(screen.getByRole('alert')).toHaveTextContent('Link de YouTube inválido');
  });

  it('forwards the remove action', async () => {
    const user = userEvent.setup();
    const { onRemoveVideo } = renderSection({ videoUrl: VALID_URL });
    await user.click(screen.getByRole('button', { name: /remover vídeo/i }));
    expect(onRemoveVideo).toHaveBeenCalled();
  });

  describe('disabled', () => {
    it('leaves the inputs enabled by default', () => {
      renderSection({ gifUrl: '', onGifUrlChange: vi.fn() });
      expect(screen.getByLabelText(/url do vídeo/i)).toBeEnabled();
      expect(screen.getByLabelText(/link do gif/i)).toBeEnabled();
    });

    it('disables both inputs and hides the remove action', () => {
      renderSection({ videoUrl: VALID_URL, gifUrl: '', onGifUrlChange: vi.fn(), disabled: true });
      expect(screen.getByLabelText(/url do vídeo/i)).toBeDisabled();
      expect(screen.getByLabelText(/link do gif/i)).toBeDisabled();
      expect(screen.queryByRole('button', { name: /remover vídeo/i })).not.toBeInTheDocument();
    });
  });

  describe('GIF', () => {
    const GIF_URL = 'https://media.example.com/agachamento.gif';

    it('renders a GIF link input', () => {
      renderSection({ gifUrl: '', onGifUrlChange: vi.fn() });
      expect(screen.getByLabelText(/link do gif/i)).toBeInTheDocument();
    });

    it('forwards typed GIF text through onGifUrlChange', async () => {
      const onGifUrlChange = vi.fn();
      renderSection({ gifUrl: '', onGifUrlChange });
      await userEvent.setup().type(screen.getByLabelText(/link do gif/i), 'h');
      expect(onGifUrlChange).toHaveBeenCalledWith('h');
    });

    it('previews the GIF in the media slot when there is no video', () => {
      renderSection({ gifUrl: GIF_URL, onGifUrlChange: vi.fn() });
      expect(screen.getByRole('img', { name: /prévia do gif/i })).toHaveAttribute('src', GIF_URL);
    });

    it('prefers the video preview over the GIF when both are set', () => {
      renderSection({ videoUrl: VALID_URL, gifUrl: GIF_URL, onGifUrlChange: vi.fn() });
      expect(screen.getByRole('img', { name: /miniatura do vídeo/i })).toBeInTheDocument();
      expect(screen.queryByRole('img', { name: /prévia do gif/i })).not.toBeInTheDocument();
    });
  });
});
