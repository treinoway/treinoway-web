import { useState } from 'react';
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
  const utils = render(<VideoField value={value} onChange={onChange} {...props} />);
  return { ...utils, onChange };
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('VideoField — empty state', () => {
  it('shows the URL input right away', () => {
    renderField();
    expect(screen.getByRole('textbox', { name: /url do youtube/i })).toBeInTheDocument();
  });

  it('does not offer the video library or a URL toggle', () => {
    renderField();
    expect(screen.queryByRole('button', { name: /escolher da biblioteca/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cole uma url do youtube/i })).not.toBeInTheDocument();
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

describe('VideoField — valid YouTube URL', () => {
  it('renders the iframe when value is a valid YouTube URL', () => {
    renderField({ value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });

    const iframe = screen.getByTitle('Vídeo de demonstração do exercício');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', expect.stringContaining('dQw4w9WgXcQ'));
  });

  it('renders only the "Remover" action when video is valid', () => {
    renderField({ value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });

    expect(screen.queryByRole('button', { name: /trocar/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remover/i })).toBeInTheDocument();
  });

  it('does not show the empty-state CTA when video is valid', () => {
    renderField({ value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });

    expect(
      screen.queryByRole('button', { name: /escolher da biblioteca/i })
    ).not.toBeInTheDocument();
  });

  it('"Remover" calls onChange with empty string', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderField({ value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', onChange });

    await user.click(screen.getByRole('button', { name: /remover/i }));

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('shows the URL input again after "Remover"', async () => {
    const user = userEvent.setup();
    const Harness = () => {
      const [value, setValue] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      return <VideoField value={value} onChange={setValue} />;
    };
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /remover/i }));

    expect(screen.getByRole('textbox', { name: /url do youtube/i })).toBeInTheDocument();
    expect(screen.queryByTitle('Vídeo de demonstração do exercício')).not.toBeInTheDocument();
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
    const onChange = vi.fn();
    const { rerender } = renderField({ onChange });

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
    expect(screen.getByRole('textbox', { name: /url do youtube/i })).toBeInTheDocument();
  });

  it('renders without crashing when value is null', () => {
    renderField({ value: null });
    expect(screen.getByRole('textbox', { name: /url do youtube/i })).toBeInTheDocument();
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
