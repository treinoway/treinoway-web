import { screen, act } from '@testing-library/react';
import { renderWithRouter } from '../test/test-utils';
import StreamingSkeleton from './StreamingSkeleton';

vi.mock('../i18n', () => ({
  getTranslations: () => ({
    iArnold: {
      skeleton: {
        thinking: 'Pensando…',
        aria: 'iArnold está processando sua pergunta',
        phrases: ['Alongando…', 'Fazendo flexões…', 'Aquecendo os músculos…'],
      },
    },
  }),
}));

const POOL = ['Alongando…', 'Fazendo flexões…', 'Aquecendo os músculos…'];

describe('StreamingSkeleton', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders 3 shimmer bars', () => {
    renderWithRouter(<StreamingSkeleton />);
    const bars = document.querySelectorAll('.streaming-skeleton__bar');
    expect(bars).toHaveLength(3);
  });

  it('renders status message when provided', () => {
    renderWithRouter(<StreamingSkeleton statusMessage="Buscando dados do aluno…" />);
    expect(screen.getByText('Buscando dados do aluno…')).toBeInTheDocument();
  });

  it('has role="status" on the container', () => {
    renderWithRouter(<StreamingSkeleton />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-live="polite" on the container', () => {
    renderWithRouter(<StreamingSkeleton />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('has descriptive aria-label on the container', () => {
    renderWithRouter(<StreamingSkeleton />);
    expect(
      screen.getByRole('status', { name: 'iArnold está processando sua pergunta' })
    ).toBeInTheDocument();
  });

  it('bar widths are set via modifier classes', () => {
    renderWithRouter(<StreamingSkeleton />);
    expect(document.querySelector('.streaming-skeleton__bar--w-90')).toBeInTheDocument();
    expect(document.querySelector('.streaming-skeleton__bar--w-75')).toBeInTheDocument();
    expect(document.querySelector('.streaming-skeleton__bar--w-60')).toBeInTheDocument();
  });

  it('renders the pulse dot element', () => {
    renderWithRouter(<StreamingSkeleton />);
    expect(document.querySelector('.streaming-skeleton__dot')).toBeInTheDocument();
  });

  it('when statusMessage is empty, renders one of the pool phrases', () => {
    renderWithRouter(<StreamingSkeleton statusMessage="" />);
    const statusText = document.querySelector('.streaming-skeleton__status-text');
    expect(POOL).toContain(statusText.textContent);
  });

  it('when statusMessage is not provided, renders one of the pool phrases', () => {
    renderWithRouter(<StreamingSkeleton />);
    const statusText = document.querySelector('.streaming-skeleton__status-text');
    expect(POOL).toContain(statusText.textContent);
  });

  it('rotates to a different phrase after 2500ms', () => {
    renderWithRouter(<StreamingSkeleton />);

    const before = document.querySelector('.streaming-skeleton__status-text').textContent;

    // Advance timer multiple times to guarantee a change (pool has 3 items,
    // adjacent-repeat prevention ensures next !== current).
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    const after = document.querySelector('.streaming-skeleton__status-text').textContent;
    expect(POOL).toContain(after);
    expect(after).not.toBe(before);
  });

  it('shows backend statusMessage and does not show pool phrase when statusMessage is truthy', () => {
    renderWithRouter(<StreamingSkeleton statusMessage="Executando ação…" />);
    expect(screen.getByText('Executando ação…')).toBeInTheDocument();
    POOL.forEach((phrase) => {
      expect(screen.queryByText(phrase)).not.toBeInTheDocument();
    });
  });

  it('stops rotating when statusMessage becomes truthy', () => {
    const { rerender } = renderWithRouter(<StreamingSkeleton statusMessage="" />);

    rerender(<StreamingSkeleton statusMessage="Executando ação…" />);

    const snapshot = document.querySelector('.streaming-skeleton__status-text').textContent;

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(document.querySelector('.streaming-skeleton__status-text').textContent).toBe(snapshot);
    expect(snapshot).toBe('Executando ação…');
  });

  it('resumes rotation when statusMessage clears', () => {
    const { rerender } = renderWithRouter(<StreamingSkeleton statusMessage="Executando ação…" />);

    rerender(<StreamingSkeleton statusMessage="" />);

    const before = document.querySelector('.streaming-skeleton__status-text').textContent;
    expect(POOL).toContain(before);

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    const after = document.querySelector('.streaming-skeleton__status-text').textContent;
    expect(POOL).toContain(after);
    expect(after).not.toBe(before);
  });

  it('cleans up interval on unmount without errors', () => {
    const { unmount } = renderWithRouter(<StreamingSkeleton />);
    expect(() => {
      act(() => {
        unmount();
        vi.advanceTimersByTime(5000);
      });
    }).not.toThrow();
  });
});
