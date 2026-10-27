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

// Returns the pool phrase currently on screen.
const currentPhrase = () => POOL.find((phrase) => screen.queryByText(phrase));

// Returns the status line currently on screen, a pool phrase or the backend message.
const shownStatus = () => [...POOL, 'Executando ação…'].find((text) => screen.queryByText(text));

describe('StreamingSkeleton', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders status message when provided', () => {
    renderWithRouter(<StreamingSkeleton statusMessage="Buscando dados do aluno…" />);
    expect(screen.getByText('Buscando dados do aluno…')).toBeInTheDocument();
  });

  it('is not a live region itself (the page announces progress once)', () => {
    renderWithRouter(<StreamingSkeleton statusMessage="Buscando dados do aluno…" />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Buscando dados do aluno…').closest('[aria-live]')).toBeNull();
  });

  it('is hidden from assistive technology', () => {
    renderWithRouter(<StreamingSkeleton statusMessage="Buscando dados do aluno…" />);
    expect(screen.getByText('Buscando dados do aluno…').closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('when statusMessage is empty, renders one of the pool phrases', () => {
    renderWithRouter(<StreamingSkeleton statusMessage="" />);
    expect(currentPhrase()).toBeDefined();
  });

  it('when statusMessage is not provided, renders one of the pool phrases', () => {
    renderWithRouter(<StreamingSkeleton />);
    expect(currentPhrase()).toBeDefined();
  });

  it('rotates to a different phrase after 2500ms', () => {
    renderWithRouter(<StreamingSkeleton />);

    const before = shownStatus();

    // Advance timer multiple times to guarantee a change (pool has 3 items,
    // adjacent-repeat prevention ensures next !== current).
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    const after = shownStatus();
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

    const snapshot = shownStatus();

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(shownStatus()).toBe(snapshot);
    expect(snapshot).toBe('Executando ação…');
  });

  it('resumes rotation when statusMessage clears', () => {
    const { rerender } = renderWithRouter(<StreamingSkeleton statusMessage="Executando ação…" />);

    rerender(<StreamingSkeleton statusMessage="" />);

    const before = shownStatus();
    expect(POOL).toContain(before);

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    const after = shownStatus();
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
