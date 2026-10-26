import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import VideoField from './VideoField';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-uid' }, loading: false }),
}));

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { items: [], total: 0 } }),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const renderField = (props = {}) => {
  const onChange = props.onChange ?? vi.fn();
  const value = props.value ?? '';
  const utils = render(<VideoField value={value} onChange={onChange} canUseLibrary {...props} />);
  return { ...utils, onChange };
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('VideoField — empty state', () => {
  it('renders the library CTA button', () => {
    renderField();
    expect(
      screen.getByRole('button', { name: /escolher da biblioteca/i })
    ).toBeInTheDocument();
  });

  it('renders the URL toggle link', () => {
    renderField();
    expect(
      screen.getByRole('button', { name: /cole uma url do youtube/i })
    ).toBeInTheDocument();
  });

  it('does not show the URL input before the toggle is clicked', () => {
    renderField();
    expect(screen.queryByRole('textbox', { name: /url do youtube/i })).not.toBeInTheDocument();
  });

  it('reveals the URL input when the toggle link is clicked', async () => {
    const user = userEvent.setup();
    renderField();

    await user.click(screen.getByRole('button', { name: /cole uma url do youtube/i }));

    expect(screen.getByRole('textbox', { name: /url do youtube/i })).toBeInTheDocument();
  });

  it('hides the URL toggle after revealing the input', async () => {
    const user = userEvent.setup();
    renderField();

    await user.click(screen.getByRole('button', { name: /cole uma url do youtube/i }));

    expect(
      screen.queryByRole('button', { name: /cole uma url do youtube/i })
    ).not.toBeInTheDocument();
  });

  it('renders the label "Vídeo de demonstração" by default', () => {
    renderField();
    expect(screen.getByText('Vídeo de demonstração')).toBeInTheDocument();
  });

  it('renders a custom label when provided', () => {
    renderField({ label: 'Vídeo do exercício' });
    expect(screen.getByText('Vídeo do exercício')).toBeInTheDocument();
  });
});

describe('VideoField — library picker', () => {
  it('opens the picker when the CTA is clicked', async () => {
    const user = userEvent.setup();
    renderField();

    await user.click(screen.getByRole('button', { name: /escolher da biblioteca/i }));

    expect(
      screen.getByRole('dialog', { name: /selecionar vídeo da biblioteca/i })
    ).toBeInTheDocument();
  });

  it('calls onChange with the video URL when a video is selected from the picker', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const apiModule = await import('../api/axios');
    apiModule.default.get.mockResolvedValue({
      data: {
        items: [
          {
            id: 'v1',
            title: 'Supino tutorial',
            url: 'https://youtube.com/watch?v=abc123',
            thumbnailUrl: null,
            category: null,
            bodySegment: null,
          },
        ],
        total: 1,
      },
    });

    renderField({ onChange });

    await user.click(screen.getByRole('button', { name: /escolher da biblioteca/i }));

    const videoItem = await screen.findByRole('button', { name: /selecionar vídeo supino tutorial/i });
    await user.click(videoItem);

    expect(onChange).toHaveBeenCalledWith('https://youtube.com/watch?v=abc123');
  });
});

describe('VideoField — valid YouTube URL', () => {
  it('renders the iframe when value is a valid YouTube URL', () => {
    renderField({ value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });

    const iframe = screen.getByTitle('Vídeo de demonstração do exercício');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', expect.stringContaining('dQw4w9WgXcQ'));
  });

  it('renders "Trocar" and "Remover" action buttons when video is valid', () => {
    renderField({ value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });

    expect(screen.getByRole('button', { name: /trocar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remover/i })).toBeInTheDocument();
  });

  it('does not show the empty-state CTA when video is valid', () => {
    renderField({ value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });

    expect(
      screen.queryByRole('button', { name: /escolher da biblioteca/i })
    ).not.toBeInTheDocument();
  });

  it('"Trocar" reopens the picker', async () => {
    const user = userEvent.setup();
    renderField({ value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });

    await user.click(screen.getByRole('button', { name: /trocar/i }));

    expect(
      screen.getByRole('dialog', { name: /selecionar vídeo da biblioteca/i })
    ).toBeInTheDocument();
  });

  it('"Remover" calls onChange with empty string', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderField({ value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', onChange });

    await user.click(screen.getByRole('button', { name: /remover/i }));

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('handles YouTube Shorts URLs', () => {
    renderField({ value: 'https://www.youtube.com/shorts/abc123XYZ' });

    const iframe = screen.getByTitle('Vídeo de demonstração do exercício');
    expect(iframe).toHaveAttribute('src', expect.stringContaining('abc123XYZ'));
  });

  it('handles youtu.be short URLs', () => {
    renderField({ value: 'https://youtu.be/dQw4w9WgXcQ' });

    const iframe = screen.getByTitle('Vídeo de demonstração do exercício');
    expect(iframe).toHaveAttribute('src', expect.stringContaining('dQw4w9WgXcQ'));
  });
});

describe('VideoField — invalid / non-YouTube URL', () => {
  it('shows a hint when a non-YouTube URL is typed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = renderField({ onChange });

    await user.click(screen.getByRole('button', { name: /cole uma url do youtube/i }));

    // Simulate parent updating value after onChange fires
    rerender(<VideoField value="https://vimeo.com/123" onChange={onChange} />);

    await waitFor(() => {
      expect(
        screen.getByText(/use um link do youtube/i)
      ).toBeInTheDocument();
    });
  });

  it('does not render an iframe for a non-YouTube URL', () => {
    renderField({ value: 'https://vimeo.com/123' });

    expect(screen.queryByTitle('Vídeo de demonstração do exercício')).not.toBeInTheDocument();
  });

  it('does not show hint when value is empty', () => {
    renderField({ value: '' });
    expect(screen.queryByText(/use um link do youtube/i)).not.toBeInTheDocument();
  });
});

describe('VideoField — null/undefined value safety', () => {
  it('renders without crashing when value is undefined', () => {
    renderField({ value: undefined });
    expect(
      screen.getByRole('button', { name: /escolher da biblioteca/i })
    ).toBeInTheDocument();
  });

  it('renders without crashing when value is null', () => {
    renderField({ value: null });
    expect(
      screen.getByRole('button', { name: /escolher da biblioteca/i })
    ).toBeInTheDocument();
  });
});

describe('VideoField — without library access', () => {
  it('hides the library CTA and shows the URL input right away', () => {
    renderField({ canUseLibrary: false });
    expect(screen.queryByRole('button', { name: /escolher da biblioteca/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/url do youtube/i)).toBeInTheDocument();
  });

  it('hides "Trocar" but keeps "Remover" for a valid video', () => {
    renderField({ canUseLibrary: false, value: 'https://www.youtube.com/watch?v=abc123XYZ' });
    expect(screen.queryByRole('button', { name: /trocar/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remover/i })).toBeInTheDocument();
  });
});

describe('VideoField — GIF', () => {
  const GIF_URL = 'https://media.example.com/agachamento.gif';

  it('renders the GIF link input', () => {
    renderField({ gifValue: '', onGifChange: vi.fn() });
    expect(screen.getByRole('textbox', { name: /link do gif/i })).toBeInTheDocument();
  });

  it('calls onGifChange when typing a GIF URL', async () => {
    const user = userEvent.setup();
    const onGifChange = vi.fn();
    renderField({ gifValue: '', onGifChange });

    await user.type(screen.getByRole('textbox', { name: /link do gif/i }), 'h');

    expect(onGifChange).toHaveBeenCalledWith('h');
  });

  it('previews the GIF as an image when there is no video', () => {
    renderField({ gifValue: GIF_URL, onGifChange: vi.fn() });
    expect(screen.getByRole('img', { name: /prévia do gif/i })).toHaveAttribute('src', GIF_URL);
  });

  it('shows the video iframe and no GIF preview when both are set', () => {
    renderField({ value: 'https://www.youtube.com/watch?v=abc123XYZ', gifValue: GIF_URL, onGifChange: vi.fn() });
    expect(document.querySelector('iframe')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /prévia do gif/i })).not.toBeInTheDocument();
  });
});
