import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import ExerciseVideoSection from './ExerciseVideoSection';

const VALID_URL = 'https://www.youtube.com/watch?v=abc123XYZ';

const renderSection = (props = {}) => {
  const handlers = { onVideoUrlChange: vi.fn(), onPickFromLibrary: vi.fn(), onRemoveVideo: vi.fn() };
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

  it('forwards the library and remove actions', async () => {
    const user = userEvent.setup();
    const { onPickFromLibrary, onRemoveVideo } = renderSection({ videoUrl: VALID_URL });
    await user.click(screen.getByRole('button', { name: /escolher da biblioteca/i }));
    await user.click(screen.getByRole('button', { name: /remover vídeo/i }));
    expect(onPickFromLibrary).toHaveBeenCalled();
    expect(onRemoveVideo).toHaveBeenCalled();
  });
});
