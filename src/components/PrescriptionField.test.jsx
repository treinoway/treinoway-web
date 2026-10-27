/* eslint-disable react/prop-types */
import { useState } from 'react';
import { vi } from 'vitest';
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
      expect(screen.getByRole('button', { name: '30s' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '120s' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '45s' })).not.toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /^\d+s$/ })).toHaveLength(5);
    });

    it('marks the Tempo tab as selected in duration mode', () => {
      render(<Harness initial={{ prescriptionMode: 'duration' }} />);
      expect(screen.getByRole('tab', { name: /tempo/i })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: /repetições/i })).toHaveAttribute('aria-selected', 'false');
    });

    it('clicking a chip fills the duration input', async () => {
      const user = userEvent.setup();
      render(<Harness initial={{ prescriptionMode: 'duration' }} />);
      await user.click(screen.getByRole('button', { name: '30s' }));
      expect(screen.getByLabelText(/^duração$/i)).toHaveValue(30);
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

// Duration harness exposing exerciseType and a spy for the stored seconds.
const DurationHarness = ({ exerciseType, duration = '', onValue }) => {
  const [formData, setFormData] = useState({
    prescriptionMode: 'duration',
    sets: '',
    repetitionsMin: '',
    repetitionsMax: '',
    duration,
  });
  onValue?.(formData.duration);
  return (
    <PrescriptionField
      idPrefix="unit"
      exerciseType={exerciseType}
      formData={formData}
      onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
    />
  );
};

describe('PrescriptionField — duration group and unit', () => {
  it('renders the chips inside the Duração field, after its input', () => {
    render(<DurationHarness />);
    const input = screen.getByLabelText(/^Duração$/);
    const chips = screen.getByRole('group', { name: /atalhos de duração/i });
    expect(input.closest('.prescription-row > div')).toContainElement(chips);
    expect(Boolean(input.compareDocumentPosition(chips) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });

  it('defaults to seconds for non-cardio and to minutes for cardio', () => {
    const { unmount } = render(<DurationHarness exerciseType="strength" />);
    expect(screen.getByRole('radio', { name: 'seg' })).toBeChecked();
    expect(screen.getByRole('button', { name: '30s' })).toBeInTheDocument();
    unmount();
    render(<DurationHarness exerciseType="cardio" />);
    expect(screen.getByRole('radio', { name: 'min' })).toBeChecked();
    expect(screen.getByRole('button', { name: '45min' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '15s' })).not.toBeInTheDocument();
  });

  it('prefills cardio in minutes only for whole minutes', () => {
    const { unmount } = render(<DurationHarness exerciseType="cardio" duration="1800" />);
    expect(screen.getByRole('radio', { name: 'min' })).toBeChecked();
    expect(screen.getByLabelText(/^Duração$/)).toHaveValue(30);
    unmount();
    render(<DurationHarness exerciseType="cardio" duration="90" />);
    expect(screen.getByRole('radio', { name: 'seg' })).toBeChecked();
    expect(screen.getByLabelText(/^Duração$/)).toHaveValue(90);
  });

  it('converts the typed value when the unit changes, both ways, keeping whole seconds stored', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<DurationHarness exerciseType="strength" duration="90" onValue={onValue} />);

    await user.click(screen.getByRole('radio', { name: 'min' }));
    expect(screen.getByLabelText(/^Duração$/)).toHaveValue(1.5);
    expect(screen.getByRole('button', { name: '10min' })).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/^Duração$/));
    await user.type(screen.getByLabelText(/^Duração$/), '2');
    await user.click(screen.getByRole('radio', { name: 'seg' }));
    expect(screen.getByLabelText(/^Duração$/)).toHaveValue(120);
    expect(onValue).toHaveBeenLastCalledWith('120');
  });

  it('rounds decimal minutes to whole seconds', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<DurationHarness exerciseType="cardio" onValue={onValue} />);
    await user.type(screen.getByLabelText(/^Duração$/), '0.51');
    expect(onValue).toHaveBeenLastCalledWith('31');
  });

  it('shows the active unit as the input suffix', async () => {
    const user = userEvent.setup();
    render(<DurationHarness exerciseType="strength" />);
    expect(screen.getByLabelText(/^Duração$/).parentElement).toHaveTextContent('seg');
    await user.click(screen.getByRole('radio', { name: 'min' }));
    expect(screen.getByLabelText(/^Duração$/).parentElement).toHaveTextContent('min');
  });

  it('keeps a user-chosen unit when the type changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DurationHarness exerciseType="strength" />);
    await user.click(screen.getByRole('radio', { name: 'min' }));
    rerender(<DurationHarness exerciseType="mobility" />);
    expect(screen.getByRole('radio', { name: 'min' })).toBeChecked();
  });

  it('follows the type default while the unit is untouched', () => {
    const { rerender } = render(<DurationHarness exerciseType="strength" />);
    expect(screen.getByRole('radio', { name: 'seg' })).toBeChecked();
    rerender(<DurationHarness exerciseType="cardio" />);
    expect(screen.getByRole('radio', { name: 'min' })).toBeChecked();
  });

  it('unit radiogroup: roving tabindex and arrow keys with wraparound', async () => {
    const user = userEvent.setup();
    render(<DurationHarness exerciseType="strength" />);
    expect(screen.getByRole('radiogroup', { name: 'Unidade da duração' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'seg' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'min' })).toHaveAttribute('tabindex', '-1');

    screen.getByRole('radio', { name: 'seg' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'min' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'min' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'seg' })).toBeChecked();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'min' })).toBeChecked();
  });
});

