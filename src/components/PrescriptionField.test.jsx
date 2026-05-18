/* eslint-disable react/prop-types */
import { useState } from 'react';
import { render, screen } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import PrescriptionField from './PrescriptionField';

const Harness = ({ initial = {} }) => {
  const [formData, setFormData] = useState({
    prescriptionMode: 'reps',
    sets: '',
    repetitionsMin: '',
    repetitionsMax: '',
    duration: '',
    ...initial,
  });
  const [durationError, setDurationError] = useState('');
  const [repsError, setRepsError] = useState('');
  return (
    <PrescriptionField
      idPrefix="harness"
      formData={formData}
      onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
      durationError={durationError}
      onClearDurationError={() => setDurationError('')}
      repsError={repsError}
      onClearRepsError={() => setRepsError('')}
    />
  );
};

describe('PrescriptionField', () => {
  describe('reps mode (default)', () => {
    it('renders sets and reps inputs', () => {
      render(<Harness />);
      expect(screen.getByLabelText(/séries/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/repetições mínimas/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/repetições máximas/i)).toBeInTheDocument();
    });

    it('renders the prescription mode section label', () => {
      render(<Harness />);
      expect(screen.getByText(/modo de prescrição/i)).toBeInTheDocument();
    });

    it('renders the inline mode toggle with Repetições and Tempo tabs', () => {
      render(<Harness />);
      expect(screen.getByRole('tab', { name: /repetições/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /tempo/i })).toBeInTheDocument();
    });

    it('marks the Repetições tab as selected by default', () => {
      render(<Harness />);
      expect(screen.getByRole('tab', { name: /repetições/i })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: /tempo/i })).toHaveAttribute('aria-selected', 'false');
    });

    it('renders no duration chips in reps mode', () => {
      render(<Harness />);
      expect(screen.queryByRole('button', { name: '45s' })).not.toBeInTheDocument();
    });

    it('does not render a "Mudar tipo de prescrição" link', () => {
      render(<Harness />);
      expect(
        screen.queryByRole('button', { name: /mudar tipo de prescrição/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('duration mode', () => {
    it('renders duration input and chips', () => {
      render(<Harness initial={{ prescriptionMode: 'duration' }} />);
      expect(screen.getByLabelText(/^duração$/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '45s' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '120s' })).toBeInTheDocument();
    });

    it('marks the Tempo tab as selected in duration mode', () => {
      render(<Harness initial={{ prescriptionMode: 'duration' }} />);
      expect(screen.getByRole('tab', { name: /tempo/i })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: /repetições/i })).toHaveAttribute('aria-selected', 'false');
    });

    it('clicking a chip fills the duration input', async () => {
      const user = userEvent.setup();
      render(<Harness initial={{ prescriptionMode: 'duration' }} />);
      await user.click(screen.getByRole('button', { name: '45s' }));
      expect(screen.getByLabelText(/^duração$/i)).toHaveValue(45);
    });

    it('marks the chip active when input equals the chip value', async () => {
      const user = userEvent.setup();
      render(<Harness initial={{ prescriptionMode: 'duration' }} />);
      await user.click(screen.getByRole('button', { name: '60s' }));
      expect(screen.getByRole('button', { name: '60s' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('shows long-duration hint at 600 seconds or more', async () => {
      const user = userEvent.setup();
      render(<Harness initial={{ prescriptionMode: 'duration' }} />);
      await user.type(screen.getByLabelText(/^duração$/i), '600');
      expect(screen.getByText(/mais de 10 minutos/i)).toBeInTheDocument();
    });

    it('does not show long-duration hint below 600 seconds', async () => {
      const user = userEvent.setup();
      render(<Harness initial={{ prescriptionMode: 'duration' }} />);
      await user.type(screen.getByLabelText(/^duração$/i), '120');
      expect(screen.queryByText(/mais de 10 minutos/i)).not.toBeInTheDocument();
    });
  });

  describe('mode switch via segmented toggle', () => {
    it('switches to duration mode when Tempo tab is clicked', async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await user.click(screen.getByRole('tab', { name: /tempo/i }));
      expect(screen.getByLabelText(/^duração$/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/repetições mínimas/i)).not.toBeInTheDocument();
    });

    it('switches back to reps mode when Repetições tab is clicked', async () => {
      const user = userEvent.setup();
      render(<Harness initial={{ prescriptionMode: 'duration' }} />);
      await user.click(screen.getByRole('tab', { name: /repetições/i }));
      expect(screen.getByLabelText(/repetições mínimas/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/^duração$/i)).not.toBeInTheDocument();
    });

    it('wipes reps value when switching to duration', async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await user.type(screen.getByLabelText(/repetições mínimas/i), '8');
      await user.click(screen.getByRole('tab', { name: /tempo/i }));
      // Switch back: reps field should be empty
      await user.click(screen.getByRole('tab', { name: /repetições/i }));
      expect(screen.getByLabelText(/repetições mínimas/i)).toHaveValue(null);
    });

    it('wipes duration value when switching to reps', async () => {
      const user = userEvent.setup();
      render(<Harness initial={{ prescriptionMode: 'duration' }} />);
      await user.type(screen.getByLabelText(/^duração$/i), '45');
      await user.click(screen.getByRole('tab', { name: /repetições/i }));
      // Switch back: duration field should be empty
      await user.click(screen.getByRole('tab', { name: /tempo/i }));
      expect(screen.getByLabelText(/^duração$/i)).toHaveValue(null);
    });

    it('clicking the already-active tab is a no-op', async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await user.type(screen.getByLabelText(/repetições mínimas/i), '8');
      await user.click(screen.getByRole('tab', { name: /repetições/i }));
      // Still in reps mode, value preserved
      expect(screen.getByLabelText(/repetições mínimas/i)).toHaveValue(8);
    });

    it('does not open a dialog when switching modes', async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await user.click(screen.getByRole('tab', { name: /tempo/i }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('error display', () => {
    const HarnessWithErrors = ({ duration = '', mode = 'reps' }) => {
      const [data] = useState({
        prescriptionMode: mode,
        sets: '',
        repetitionsMin: '',
        repetitionsMax: '',
        duration,
      });
      return (
        <PrescriptionField
          idPrefix="harness-err"
          formData={data}
          onChange={() => {}}
          durationError="Defina o valor antes de salvar."
          repsError="Defina o valor antes de salvar."
        />
      );
    };

    it('renders duration error in duration mode', () => {
      render(<HarnessWithErrors mode="duration" />);
      expect(screen.getByRole('alert')).toHaveTextContent(/defina o valor/i);
    });

    it('renders reps error in reps mode', () => {
      render(<HarnessWithErrors mode="reps" />);
      expect(screen.getByRole('alert')).toHaveTextContent(/defina o valor/i);
    });
  });
});
