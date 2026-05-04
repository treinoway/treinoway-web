import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { renderWithRoute } from '../test/test-utils';
import PulseBand from './PulseBand';

const defaultProps = {
  state: 'warning',
  periodLabel: 'Últimos 30 dias',
  protocol: { name: 'Hipertrofia 4x', weekNumber: 3, totalWeeks: 8 },
  adherenceLabel: '62%',
  deltaLabel: '+8%',
  completedSessions: 10,
  totalSessions: 16,
  vizData: { type: 'waveform', bars: [] },
  stats: { vsAnterior: '+8%', maxStreak: 5, sessionsPerWeek: 3.5, daysSinceLast: 2 },
  onPeriodClick: vi.fn(),
  onAssignProtocol: vi.fn(),
};

describe('PulseBand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('warning state (default)', () => {
    it('renders adherence number', () => {
      renderWithRoute(<PulseBand {...defaultProps} />);
      expect(screen.getByText('62')).toBeInTheDocument();
    });

    it('renders the period chip with the period label', () => {
      renderWithRoute(<PulseBand {...defaultProps} />);
      expect(screen.getByText('Últimos 30 dias')).toBeInTheDocument();
    });

    it('renders protocol name in the sash', () => {
      renderWithRoute(<PulseBand {...defaultProps} />);
      expect(screen.getByText('Hipertrofia 4x')).toBeInTheDocument();
    });

    it('renders status pill "Atenção" in warning state', () => {
      renderWithRoute(<PulseBand {...defaultProps} />);
      expect(screen.getByText('Atenção')).toBeInTheDocument();
    });

    it('renders session caption', () => {
      renderWithRoute(<PulseBand {...defaultProps} />);
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText(/sessões concluídas/)).toBeInTheDocument();
    });

    it('renders stat chips with correct labels', () => {
      renderWithRoute(<PulseBand {...defaultProps} />);
      expect(screen.getByText('Vs anterior')).toBeInTheDocument();
      expect(screen.getByText('Maior streak')).toBeInTheDocument();
      expect(screen.getByText('Treinos/sem')).toBeInTheDocument();
      expect(screen.getByText('Sem treinar')).toBeInTheDocument();
    });

    it('calls onPeriodClick when period chip is clicked', async () => {
      const user = userEvent.setup();
      renderWithRoute(<PulseBand {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: /alterar período/i }));
      expect(defaultProps.onPeriodClick).toHaveBeenCalledOnce();
    });
  });

  describe('success state', () => {
    it('renders "Em dia" status pill in success state', () => {
      renderWithRoute(<PulseBand {...defaultProps} state="success" />);
      expect(screen.getByText('Em dia')).toBeInTheDocument();
    });

    it('applies pulse-band--success class', () => {
      const { container } = renderWithRoute(
        <PulseBand {...defaultProps} state="success" />,
      );
      expect(container.querySelector('.pulse-band--success')).toBeInTheDocument();
    });
  });

  describe('empty state (new student)', () => {
    const emptyProps = {
      ...defaultProps,
      state: 'empty',
      protocol: null,
      adherenceLabel: null,
      deltaLabel: null,
      completedSessions: 0,
      totalSessions: 0,
      stats: null,
    };

    it('applies pulse-band--empty class', () => {
      const { container } = renderWithRoute(<PulseBand {...emptyProps} />);
      expect(container.querySelector('.pulse-band--empty')).toBeInTheDocument();
    });

    it('renders "Sem dados" status pill', () => {
      renderWithRoute(<PulseBand {...emptyProps} />);
      expect(screen.getByText('Sem dados')).toBeInTheDocument();
    });

    it('renders "Atribuir rotina" CTA in sash', () => {
      renderWithRoute(<PulseBand {...emptyProps} />);
      expect(screen.getByRole('button', { name: /atribuir rotina/i })).toBeInTheDocument();
    });

    it('calls onAssignProtocol when CTA is clicked', async () => {
      const user = userEvent.setup();
      renderWithRoute(<PulseBand {...emptyProps} />);
      await user.click(screen.getByRole('button', { name: /atribuir rotina/i }));
      expect(emptyProps.onAssignProtocol).toHaveBeenCalledOnce();
    });

    it('does not render session caption in empty state', () => {
      renderWithRoute(<PulseBand {...emptyProps} />);
      expect(screen.queryByText(/sessões concluídas/)).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('applies pulse-band--loading class', () => {
      const { container } = renderWithRoute(
        <PulseBand {...defaultProps} state="loading" />,
      );
      expect(container.querySelector('.pulse-band--loading')).toBeInTheDocument();
    });

    it('still renders the sash and period chip during loading', () => {
      renderWithRoute(<PulseBand {...defaultProps} state="loading" />);
      expect(screen.getByRole('button', { name: /alterar período/i })).toBeInTheDocument();
    });
  });

  describe('heatmap vizData', () => {
    it('renders heatmap when vizData.type is heatmap', () => {
      const heatmapViz = {
        type: 'heatmap',
        weeks: [
          {
            label: 'abr',
            days: Array.from({ length: 7 }, (_, i) => ({
              date: `2026-04-${String(20 + i).padStart(2, '0')}`,
              status: 'empty',
              volumeKg: null,
              isToday: false,
              isFirstRow: true,
              inPeriod: true,
            })),
          },
        ],
        dowLabels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
        maxVolumeKg: 0,
      };
      const { container } = renderWithRoute(
        <PulseBand {...defaultProps} vizData={heatmapViz} />,
      );
      expect(container.querySelector('.pulse-heatmap')).toBeInTheDocument();
    });
  });

  describe('protocol-less sash', () => {
    it('renders "Atribuir rotina" when protocol is null (non-empty state)', () => {
      renderWithRoute(
        <PulseBand {...defaultProps} protocol={null} state="warning" />,
      );
      expect(screen.getByRole('button', { name: /atribuir rotina/i })).toBeInTheDocument();
    });
  });

  describe('delta display', () => {
    it('renders delta chip when deltaLabel provided', () => {
      const { container } = renderWithRoute(<PulseBand {...defaultProps} deltaLabel="+8%" />);
      // pulse-delta span specifically (vsAnterior stat chip also shows "+8%" in defaultProps)
      expect(container.querySelector('.pulse-delta')).toBeInTheDocument();
    });

    it('does not render delta chip when deltaLabel is null', () => {
      renderWithRoute(<PulseBand {...defaultProps} deltaLabel={null} />);
      expect(screen.queryByText(/pulse-delta/)).not.toBeInTheDocument();
    });
  });
});
