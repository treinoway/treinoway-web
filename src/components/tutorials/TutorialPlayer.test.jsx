import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import TutorialPlayer from './TutorialPlayer';

const base = { title: 'Aula', description: 'Desc', videoSource: 'link' };

describe('TutorialPlayer', () => {
  it('embeds YouTube links', () => {
    render(<TutorialPlayer tutorial={{ ...base, videoUrl: 'https://youtu.be/abc123XYZ' }} onClose={vi.fn()} />);
    expect(screen.getByTitle('Aula').tagName).toBe('IFRAME');
    expect(screen.getByText('Desc')).toBeInTheDocument();
  });

  it('offers an external link for unknown providers', () => {
    render(<TutorialPlayer tutorial={{ ...base, videoUrl: 'https://vimeo.com/1' }} onClose={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Abrir vídeo' })).toHaveAttribute('href', 'https://vimeo.com/1');
  });

  it('calls onClose from the close button', async () => {
    const onClose = vi.fn();
    render(<TutorialPlayer tutorial={{ ...base, videoUrl: 'https://vimeo.com/1' }} onClose={onClose} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClose).toHaveBeenCalled();
  });
});
