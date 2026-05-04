import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { renderWithRoute } from '../test/test-utils';
import ProgressionRow from './ProgressionRow';

const makeEntry = (overrides = {}) => ({
  exerciseId: 'ex-1',
  exerciseName: 'Supino reto',
  hasLoad: true,
  sessionCount: 5,
  loadHistory: [80, 90, 95, 100, 105],
  latest: { maxLoad: 105 },
  trend: { maxLoadDelta: 25, maxLoadDeltaPct: 31.25 },
  trainingId: 'tr-1',
  ...overrides,
});

describe('ProgressionRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('with load data', () => {
    it('renders exercise name', () => {
      renderWithRoute(<ProgressionRow entry={makeEntry()} onOpen={vi.fn()} />);
      expect(screen.getByText('Supino reto')).toBeInTheDocument();
    });

    it('renders latest load in trail', () => {
      renderWithRoute(<ProgressionRow entry={makeEntry()} onOpen={vi.fn()} />);
      expect(screen.getByText(/105 kg/)).toBeInTheDocument();
    });

    it('renders TrendChip with delta value', () => {
      const { container } = renderWithRoute(
        <ProgressionRow entry={makeEntry()} onOpen={vi.fn()} />,
      );
      expect(container.querySelector('.trend-chip')).toBeInTheDocument();
    });

    it('calls onOpen on click', async () => {
      const user = userEvent.setup();
      const onOpen = vi.fn();
      renderWithRoute(<ProgressionRow entry={makeEntry()} onOpen={onOpen} />);
      await user.click(screen.getByRole('link', { name: /Supino reto/i }));
      expect(onOpen).toHaveBeenCalledOnce();
    });

    it('calls onOpen on Enter key', async () => {
      const user = userEvent.setup();
      const onOpen = vi.fn();
      renderWithRoute(<ProgressionRow entry={makeEntry()} onOpen={onOpen} />);
      const row = screen.getByRole('link', { name: /Supino reto/i });
      row.focus();
      await user.keyboard('{Enter}');
      expect(onOpen).toHaveBeenCalledOnce();
    });

    it('calls onOpen on Space key', async () => {
      const user = userEvent.setup();
      const onOpen = vi.fn();
      renderWithRoute(<ProgressionRow entry={makeEntry()} onOpen={onOpen} />);
      const row = screen.getByRole('link', { name: /Supino reto/i });
      row.focus();
      await user.keyboard(' ');
      expect(onOpen).toHaveBeenCalledOnce();
    });

    it('renders sparkline when shouldShowSparkline returns true', () => {
      // CV > 0.08 triggers sparkline: wide spread loadHistory
      const entry = makeEntry({
        loadHistory: [60, 80, 100, 120, 140],
        trend: { maxLoadDelta: 80, maxLoadDeltaPct: 133 },
      });
      const { container } = renderWithRoute(
        <ProgressionRow entry={entry} onOpen={vi.fn()} />,
      );
      // Should NOT have the --hidden modifier
      expect(container.querySelector('.progression-spark--hidden')).not.toBeInTheDocument();
    });

    it('hides sparkline when shouldShowSparkline returns false', () => {
      // Tight linear series, small delta → sparkline hidden
      const entry = makeEntry({
        loadHistory: [100, 101, 102, 103, 104],
        trend: { maxLoadDelta: 4, maxLoadDeltaPct: 4 },
      });
      const { container } = renderWithRoute(
        <ProgressionRow entry={entry} onOpen={vi.fn()} />,
      );
      expect(container.querySelector('.progression-spark--hidden')).toBeInTheDocument();
    });

    it('shows neutral TrendChip for single-session entry', () => {
      const entry = makeEntry({ sessionCount: 1, trend: null });
      const { container } = renderWithRoute(
        <ProgressionRow entry={entry} onOpen={vi.fn()} />,
      );
      expect(container.querySelector('.trend-chip--neutral')).toBeInTheDocument();
    });
  });

  describe('without load data', () => {
    const noLoadEntry = makeEntry({ hasLoad: false });

    it('renders "Sem carga registrada" trail', () => {
      renderWithRoute(<ProgressionRow entry={noLoadEntry} onOpen={vi.fn()} />);
      expect(screen.getByText('Sem carga registrada')).toBeInTheDocument();
    });

    it('still renders the row as a link', () => {
      renderWithRoute(<ProgressionRow entry={noLoadEntry} onOpen={vi.fn()} />);
      expect(screen.getByRole('link', { name: /Supino reto/i })).toBeInTheDocument();
    });

    it('calls onOpen on click', async () => {
      const user = userEvent.setup();
      const onOpen = vi.fn();
      renderWithRoute(<ProgressionRow entry={noLoadEntry} onOpen={onOpen} />);
      await user.click(screen.getByRole('link', { name: /Supino reto/i }));
      expect(onOpen).toHaveBeenCalledOnce();
    });

    it('hides sparkline (always hidden when no load)', () => {
      const { container } = renderWithRoute(
        <ProgressionRow entry={noLoadEntry} onOpen={vi.fn()} />,
      );
      expect(container.querySelector('.progression-spark--hidden')).toBeInTheDocument();
    });
  });

  describe('fallback for missing fields', () => {
    it('renders fallback "—" when exerciseName is null', () => {
      const entry = makeEntry({ exerciseName: null });
      renderWithRoute(<ProgressionRow entry={entry} onOpen={vi.fn()} />);
      expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });

    it('handles missing loadHistory gracefully', () => {
      const entry = makeEntry({ loadHistory: undefined });
      expect(() =>
        renderWithRoute(<ProgressionRow entry={entry} onOpen={vi.fn()} />),
      ).not.toThrow();
    });
  });
});
