import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import PrescriptionBand, { NotesField } from './PrescriptionBand';

const REPS_FORM = {
  prescriptionMode: 'reps',
  sets: '3',
  repetitionsMin: '8',
  repetitionsMax: '12',
  duration: '',
  restInterval: '90',
  hasLoad: true,
  suggestedLoad: '20',
};

// Builds the band props with spies; `form` overrides the fixture.
const buildProps = (form = {}) => ({
  form: { ...REPS_FORM, ...form },
  onFieldChange: vi.fn(),
  onPrescriptionChange: vi.fn(),
  onLoadToggle: vi.fn(),
  onRestChip: vi.fn(),
});

describe('PrescriptionBand — mode', () => {
  it('shows sets and the reps range in reps mode, without the duration field', () => {
    render(<PrescriptionBand {...buildProps()} />);
    expect(screen.getByLabelText(/Séries/i)).toHaveValue(3);
    expect(screen.getByLabelText(/Repetições mínimas/i)).toHaveValue(8);
    expect(screen.getByLabelText(/Repetições máximas/i)).toHaveValue(12);
    expect(screen.queryByLabelText(/^Duração$/)).not.toBeInTheDocument();
  });

  it('shows the duration field instead of reps in time mode', () => {
    render(<PrescriptionBand {...buildProps({ prescriptionMode: 'duration', duration: '45' })} />);
    expect(screen.getByLabelText(/^Duração$/)).toHaveValue(45);
    expect(screen.queryByLabelText(/Repetições mínimas/i)).not.toBeInTheDocument();
  });

  it('switching to "Tempo" reports the new mode', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    render(<PrescriptionBand {...props} />);
    await user.click(screen.getByRole('tab', { name: /Tempo/i }));
    expect(props.onPrescriptionChange).toHaveBeenCalledWith(expect.objectContaining({ prescriptionMode: 'duration' }));
  });
});

describe('PrescriptionBand — edits', () => {
  it('reports sets, min and max reps as patches', async () => {
    const user = userEvent.setup();
    const props = buildProps({ sets: '', repetitionsMin: '', repetitionsMax: '' });
    render(<PrescriptionBand {...props} />);
    await user.type(screen.getByLabelText(/Séries/i), '4');
    await user.type(screen.getByLabelText(/Repetições mínimas/i), '6');
    await user.type(screen.getByLabelText(/Repetições máximas/i), '9');
    expect(props.onPrescriptionChange).toHaveBeenCalledWith({ sets: '4' });
    expect(props.onPrescriptionChange).toHaveBeenCalledWith({ repetitionsMin: '6' });
    expect(props.onPrescriptionChange).toHaveBeenCalledWith({ repetitionsMax: '9' });
  });

  it('reports the rest interval and the suggested load by field name', async () => {
    const user = userEvent.setup();
    const props = buildProps({ restInterval: '', suggestedLoad: '' });
    render(<PrescriptionBand {...props} />);
    await user.type(screen.getByLabelText(/Intervalo de descanso/i), '7');
    await user.type(screen.getByLabelText(/Carga sugerida/i), '5');
    expect(props.onFieldChange).toHaveBeenCalledWith('restInterval', '7');
    expect(props.onFieldChange).toHaveBeenCalledWith('suggestedLoad', '5');
  });
});

describe('PrescriptionBand — rest presets', () => {
  it('clicking a preset reports its seconds', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    render(<PrescriptionBand {...props} />);
    await user.click(screen.getByRole('button', { name: '120s' }));
    expect(props.onRestChip).toHaveBeenCalledWith(120);
  });

  it('marks the preset matching the current rest as pressed', () => {
    render(<PrescriptionBand {...buildProps({ restInterval: '90' })} />);
    expect(screen.getByRole('button', { name: '90s' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '60s' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks no preset when the rest is custom', () => {
    render(<PrescriptionBand {...buildProps({ restInterval: '75' })} />);
    screen.getAllByRole('button', { name: /^\d+s$/ }).forEach((chip) => {
      expect(chip).toHaveAttribute('aria-pressed', 'false');
    });
  });
});

describe('PrescriptionBand — load', () => {
  it('shows "Carga sugerida" while the load switch is on', () => {
    render(<PrescriptionBand {...buildProps({ hasLoad: true })} />);
    expect(screen.getByRole('switch', { name: /Exercício com carga/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText(/Carga sugerida/i)).toHaveValue(20);
  });

  it('hides "Carga sugerida" while the load switch is off', () => {
    render(<PrescriptionBand {...buildProps({ hasLoad: false })} />);
    expect(screen.getByRole('switch', { name: /Exercício com carga/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByLabelText(/Carga sugerida/i)).not.toBeInTheDocument();
  });

  it('toggling the switch reports the opposite value', async () => {
    const user = userEvent.setup();
    const props = buildProps({ hasLoad: true });
    render(<PrescriptionBand {...props} />);
    await user.click(screen.getByRole('switch', { name: /Exercício com carga/i }));
    expect(props.onLoadToggle).toHaveBeenCalledWith(false);
  });
});

describe('NotesField', () => {
  it('shows the current notes under the "Observações" label', () => {
    render(<NotesField value="Controle a descida" onChange={vi.fn()} />);
    expect(screen.getByLabelText(/Observações/i)).toHaveValue('Controle a descida');
  });

  it('reports typed text', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<NotesField value="" onChange={onChange} />);
    await user.type(screen.getByLabelText(/Observações/i), 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });
});

// True when `first` comes before `second` in the document.
const isBefore = (first, second) =>
  Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

// Band followed by the notes field, as in the single add.
const BandWithNotes = (props) => (
  <>
    <PrescriptionBand {...props} />
    <NotesField value="" onChange={vi.fn()} />
  </>
);

describe('PrescriptionBand — compact grid order (criterion 27)', () => {
  it('orders Séries, Repetições, Descanso, then Carga, then Observações', () => {
    render(<BandWithNotes {...buildProps()} />);
    const sets = screen.getByLabelText(/Séries/i);
    const reps = screen.getByLabelText(/Repetições mínimas/i);
    const rest = screen.getByLabelText(/Intervalo de descanso/i);
    const load = screen.getByLabelText(/Carga sugerida/i);
    const notes = screen.getByLabelText(/Observações/i);
    expect(isBefore(sets, reps)).toBe(true);
    expect(isBefore(reps, rest)).toBe(true);
    expect(isBefore(rest, load)).toBe(true);
    expect(isBefore(load, notes)).toBe(true);
  });

  it('puts Duração (not Repetições) between Séries and Descanso in time mode', () => {
    render(<BandWithNotes {...buildProps({ prescriptionMode: 'duration', duration: '45' })} />);
    const sets = screen.getByLabelText(/Séries/i);
    const duration = screen.getByLabelText(/^Duração$/);
    const rest = screen.getByLabelText(/Intervalo de descanso/i);
    expect(isBefore(sets, duration)).toBe(true);
    expect(isBefore(duration, rest)).toBe(true);
  });

  it('keeps Descanso in the same grid as the prescription fields and the load row outside it', () => {
    render(<PrescriptionBand {...buildProps()} />);
    const grid = screen.getByLabelText(/Séries/i).closest('.prescription-row');
    expect(grid).toContainElement(screen.getByLabelText(/Intervalo de descanso/i));
    expect(grid).not.toContainElement(screen.getByRole('switch', { name: /Exercício com carga/i }));
  });

  it('shares the load switch and the Carga sugerida input in one row, which collapses when off', () => {
    const { rerender } = render(<PrescriptionBand {...buildProps({ hasLoad: true })} />);
    const switchButton = screen.getByRole('switch', { name: /Exercício com carga/i });
    expect(switchButton.closest('.composer-load-col')).toContainElement(screen.getByLabelText(/Carga sugerida/i));
    const noLoadProps = buildProps({ hasLoad: false });
    rerender(<PrescriptionBand {...noLoadProps} />);
    expect(screen.queryByLabelText(/Carga sugerida/i)).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /Exercício com carga/i })).toBeInTheDocument();
  });
});

