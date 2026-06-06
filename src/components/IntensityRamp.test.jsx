import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import IntensityRamp from './IntensityRamp';
import { EXERCISE_INTENSITY_OPTIONS } from '../constants/exerciseIntensity';

const setup = (props = {}) => {
  const onChange = vi.fn();
  const onClear = vi.fn();
  render(
    <IntensityRamp
      idPrefix="test"
      value={null}
      options={EXERCISE_INTENSITY_OPTIONS}
      onChange={onChange}
      onClear={onClear}
      {...props}
    />
  );
  return { onChange, onClear };
};

describe('IntensityRamp', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders five ordered radio steps from the options', () => {
    setup();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(5);
    expect(radios[0]).toHaveTextContent('Muito leve');
    expect(radios[4]).toHaveTextContent('Quase máxima');
  });

  it('exposes a radiogroup labelled by the field label', () => {
    setup();
    expect(
      screen.getByRole('radiogroup', { name: 'Intensidade' })
    ).toBeInTheDocument();
  });

  it('puts exactly one step in the tab order when none is selected (the first)', () => {
    setup();
    const radios = screen.getAllByRole('radio');
    const tabbable = radios.filter((r) => r.getAttribute('tabindex') === '0');
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toHaveTextContent('Muito leve');
  });

  it('makes the selected step the only tabbable one', () => {
    setup({ value: 'moderate' });
    const radios = screen.getAllByRole('radio');
    const tabbable = radios.filter((r) => r.getAttribute('tabindex') === '0');
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toHaveTextContent('Moderada');
    expect(tabbable[0]).toHaveAttribute('aria-checked', 'true');
  });

  it('selects a step on click sending the key (not the label)', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();
    await user.click(screen.getByRole('radio', { name: 'Vigorosa' }));
    expect(onChange).toHaveBeenCalledWith('vigorous');
  });

  it('ArrowRight moves selection to the next step', async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ value: 'moderate' });
    screen.getByRole('radio', { name: 'Moderada' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('vigorous');
  });

  it('ArrowLeft moves selection to the previous step', async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ value: 'moderate' });
    screen.getByRole('radio', { name: 'Moderada' }).focus();
    await user.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenCalledWith('light');
  });

  it('does not wrap past the last step', async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ value: 'near_maximal' });
    screen.getByRole('radio', { name: 'Quase máxima' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('near_maximal');
  });

  it('Home and End jump to first and last', async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ value: 'moderate' });
    screen.getByRole('radio', { name: 'Moderada' }).focus();
    await user.keyboard('{Home}');
    expect(onChange).toHaveBeenCalledWith('very_light');
    await user.keyboard('{End}');
    expect(onChange).toHaveBeenCalledWith('near_maximal');
  });

  it('shows the clear chip only when a value is selected and calls onClear', async () => {
    const user = userEvent.setup();
    const { onClear } = setup({ value: 'moderate' });
    const clearBtn = screen.getByRole('button', { name: /sem intensidade definida/i });
    await user.click(clearBtn);
    expect(onClear).toHaveBeenCalled();
  });

  it('hides the clear chip when no value is selected', () => {
    setup();
    expect(
      screen.queryByRole('button', { name: /sem intensidade definida/i })
    ).not.toBeInTheDocument();
  });

  it('announces the selected value in a scoped live region', () => {
    setup({ value: 'moderate' });
    const status = screen.getByText(/Selecionada:/);
    expect(status).toHaveTextContent('Moderada');
  });
});
