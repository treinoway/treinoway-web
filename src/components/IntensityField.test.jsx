import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import IntensityField from './IntensityField';
import { EXERCISE_INTENSITY_OPTIONS } from '../constants/exerciseIntensity';

const setup = (props = {}) => {
  const onChange = vi.fn();
  const onClear = vi.fn();
  const onKeepCardio = vi.fn();
  render(
    <IntensityField
      idPrefix="test"
      type="cardio"
      intensity={null}
      options={EXERCISE_INTENSITY_OPTIONS}
      errorMessage={null}
      onChange={onChange}
      onClear={onClear}
      onKeepCardio={onKeepCardio}
      {...props}
    />
  );
  return { onChange, onClear, onKeepCardio };
};

describe('IntensityField', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the ramp when the type is cardio', () => {
    setup({ type: 'cardio' });
    expect(
      screen.getByRole('radiogroup', { name: 'Intensidade' })
    ).toBeInTheDocument();
  });

  it('renders nothing for a non-cardio type with no retained intensity', () => {
    const { container } = render(
      <IntensityField
        idPrefix="test"
        type="strength"
        intensity={null}
        options={EXERCISE_INTENSITY_OPTIONS}
        onChange={vi.fn()}
        onClear={vi.fn()}
        onKeepCardio={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the type-flip warning when intensity is retained on a non-cardio type', () => {
    setup({ type: 'strength', intensity: 'vigorous' });
    expect(screen.getByRole('status')).toHaveTextContent(/exclusiva de cardio/i);
    expect(screen.getByText('"Vigorosa"')).toBeInTheDocument();
  });

  it('keeps the retained value visible but inert (no tabbable steps)', () => {
    setup({ type: 'strength', intensity: 'vigorous' });
    const retainedGroup = screen.getByRole('radiogroup', {
      name: 'Intensidade (guardada)',
    });
    expect(retainedGroup).toHaveAttribute('aria-disabled', 'true');
  });

  it('calls onKeepCardio from the warning banner', async () => {
    const user = userEvent.setup();
    const { onKeepCardio } = setup({ type: 'strength', intensity: 'vigorous' });
    await user.click(screen.getByRole('button', { name: /manter cardio/i }));
    expect(onKeepCardio).toHaveBeenCalled();
  });

  it('calls onClear from the warning banner remove action', async () => {
    const user = userEvent.setup();
    const { onClear } = setup({ type: 'strength', intensity: 'vigorous' });
    await user.click(screen.getByRole('button', { name: /remover intensidade/i }));
    expect(onClear).toHaveBeenCalled();
  });

  it('renders the defensive 400 error with role=alert and a remediation action', async () => {
    const user = userEvent.setup();
    const { onClear } = setup({
      type: 'cardio',
      intensity: 'vigorous',
      errorMessage: 'A intensidade só pode ser definida para exercícios do tipo cardio.',
    });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/só pode ser definida/i);
    await user.click(screen.getByRole('button', { name: /remover intensidade/i }));
    expect(onClear).toHaveBeenCalled();
  });
});
