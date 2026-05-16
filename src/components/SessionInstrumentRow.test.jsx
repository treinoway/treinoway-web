import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { renderWithRoute } from '../test/test-utils';
import SessionInstrumentRow from './SessionInstrumentRow';

const defaultProps = {
  status: 'completed',
  date: '2026-04-28',
  sessionName: 'Treino A — Peito e Tríceps',
  metaText: '8 de 10 séries',
  noteText: null,
  rpeText: null,
};

describe('SessionInstrumentRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering — completed state', () => {
    it('renders session name', () => {
      renderWithRoute(<SessionInstrumentRow {...defaultProps} />);
      expect(screen.getByText('Treino A — Peito e Tríceps')).toBeInTheDocument();
    });

    it('renders meta text', () => {
      renderWithRoute(<SessionInstrumentRow {...defaultProps} />);
      expect(screen.getByText('8 de 10 séries')).toBeInTheDocument();
    });

    it('applies session-bar--success class for completed status', () => {
      const { container } = renderWithRoute(<SessionInstrumentRow {...defaultProps} />);
      expect(container.querySelector('.session-bar--success')).toBeInTheDocument();
    });

    it('does NOT render a status icon element', () => {
      const { container } = renderWithRoute(<SessionInstrumentRow {...defaultProps} />);
      expect(container.querySelector('.session-status--completed')).not.toBeInTheDocument();
      expect(container.querySelector('.session-status')).not.toBeInTheDocument();
    });

    it('renders date parts (day number and month)', () => {
      renderWithRoute(<SessionInstrumentRow {...defaultProps} />);
      expect(screen.getByText('28')).toBeInTheDocument();
      expect(screen.getByText('ABR')).toBeInTheDocument();
    });
  });

  describe('rendering — partial state', () => {
    it('applies session-bar--partial class', () => {
      const { container } = renderWithRoute(
        <SessionInstrumentRow {...defaultProps} status="partial" />,
      );
      expect(container.querySelector('.session-bar--partial')).toBeInTheDocument();
    });

    it('does NOT render a status-partial icon element', () => {
      const { container } = renderWithRoute(
        <SessionInstrumentRow {...defaultProps} status="partial" />,
      );
      expect(container.querySelector('.session-status--partial')).not.toBeInTheDocument();
    });
  });

  describe('rendering — abandoned state', () => {
    it('applies session-bar--abandoned class', () => {
      const { container } = renderWithRoute(
        <SessionInstrumentRow {...defaultProps} status="abandoned" />,
      );
      expect(container.querySelector('.session-bar--abandoned')).toBeInTheDocument();
    });

    it('does NOT render a status-abandoned icon element', () => {
      const { container } = renderWithRoute(
        <SessionInstrumentRow {...defaultProps} status="abandoned" />,
      );
      expect(container.querySelector('.session-status--abandoned')).not.toBeInTheDocument();
    });
  });

  describe('RPE chip', () => {
    it('renders RPE chip with "RPE" label and value when rpeText is provided', () => {
      renderWithRoute(<SessionInstrumentRow {...defaultProps} rpeText="7,5" />);
      const chip = document.querySelector('.session-rpe-chip');
      expect(chip).toBeInTheDocument();
      expect(chip).toHaveTextContent('RPE');
      expect(chip).toHaveTextContent('7,5');
    });

    it('renders the "RPE" prefix label as a separate element inside the chip', () => {
      renderWithRoute(<SessionInstrumentRow {...defaultProps} rpeText="8" />);
      expect(document.querySelector('.session-rpe-chip-label')).toBeInTheDocument();
      expect(screen.getByText('RPE')).toBeInTheDocument();
    });

    it('does not render RPE chip when rpeText is null', () => {
      renderWithRoute(<SessionInstrumentRow {...defaultProps} rpeText={null} />);
      expect(document.querySelector('.session-rpe-chip')).not.toBeInTheDocument();
      expect(screen.queryByText('RPE')).not.toBeInTheDocument();
    });

    it('does not render metaText inside session-meta when only rpeText is present', () => {
      renderWithRoute(
        <SessionInstrumentRow {...defaultProps} metaText={null} rpeText="6" />,
      );
      expect(document.querySelector('.session-meta')).not.toBeInTheDocument();
    });
  });

  describe('note trigger', () => {
    it('does not render note trigger button when noteText is null', () => {
      renderWithRoute(<SessionInstrumentRow {...defaultProps} noteText={null} />);
      expect(screen.queryByRole('button', { name: /anotação/i })).not.toBeInTheDocument();
    });

    it('renders note trigger button when noteText is provided', () => {
      renderWithRoute(
        <SessionInstrumentRow {...defaultProps} noteText="Foco no isolamento." />,
      );
      expect(screen.getByRole('button', { name: /ver anotação/i })).toBeInTheDocument();
    });

    it('note panel is not visible initially', () => {
      renderWithRoute(
        <SessionInstrumentRow {...defaultProps} noteText="Foco no isolamento." />,
      );
      expect(screen.queryByText('Foco no isolamento.')).not.toBeInTheDocument();
    });

    it('opens note panel on trigger click', async () => {
      const user = userEvent.setup();
      renderWithRoute(
        <SessionInstrumentRow {...defaultProps} noteText="Foco no isolamento." />,
      );
      await user.click(screen.getByRole('button', { name: /ver anotação/i }));
      expect(screen.getByText('Foco no isolamento.')).toBeInTheDocument();
    });

    it('closes note panel on second trigger click', async () => {
      const user = userEvent.setup();
      renderWithRoute(
        <SessionInstrumentRow {...defaultProps} noteText="Foco no isolamento." />,
      );
      const btn = screen.getByRole('button', { name: /ver anotação/i });
      await user.click(btn);
      expect(screen.getByText('Foco no isolamento.')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /fechar anotação/i }));
      expect(screen.queryByText('Foco no isolamento.')).not.toBeInTheDocument();
    });

    it('note trigger aria-expanded reflects open state', async () => {
      const user = userEvent.setup();
      renderWithRoute(
        <SessionInstrumentRow {...defaultProps} noteText="Nota." />,
      );
      const btn = screen.getByRole('button', { name: /ver anotação/i });
      expect(btn).toHaveAttribute('aria-expanded', 'false');
      await user.click(btn);
      expect(screen.getByRole('button', { name: /fechar anotação/i })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
    });
  });

  describe('null/fallback handling', () => {
    it('renders fallback "—" when sessionName is null', () => {
      renderWithRoute(<SessionInstrumentRow {...defaultProps} sessionName={null} />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('renders fallback "—" when date is null', () => {
      const { container } = renderWithRoute(
        <SessionInstrumentRow {...defaultProps} date={null} />,
      );
      const dashes = container.querySelectorAll('.session-date span');
      const dashTexts = Array.from(dashes).filter((el) => el.textContent === '—');
      expect(dashTexts.length).toBeGreaterThan(0);
    });

    it('renders trigger placeholder when noteText is null', () => {
      const { container } = renderWithRoute(
        <SessionInstrumentRow {...defaultProps} noteText={null} />,
      );
      expect(container.querySelector('.session-trigger-placeholder')).toBeInTheDocument();
    });
  });
});
