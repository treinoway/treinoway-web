import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import ChoiceChips from './ChoiceChips';

const TYPE_OPTIONS = [
  { value: 'score', label: 'Nota' },
  { value: 'stars', label: 'Estrelas' },
  { value: 'open', label: 'Aberta' },
];
const CONDITION_OPTIONS = [
  { value: null, label: 'Sempre' },
  { value: 'has_meal_plan', label: 'Só se o aluno tem plano alimentar' },
];

// Renders the chips of the answer type with the given value
const renderTypeChips = (value, onChange = vi.fn()) => {
  render(<ChoiceChips label="Tipo de resposta" options={TYPE_OPTIONS} value={value} onChange={onChange} />);
  return onChange;
};

describe('ChoiceChips', () => {
  it('shows one chip per option, in order, inside a group named by the label', () => {
    renderTypeChips('score');

    const group = screen.getByRole('group', { name: 'Tipo de resposta' });
    const chips = within(group).getAllByRole('button');
    expect(chips.map((chip) => chip.textContent)).toEqual(['Nota', 'Estrelas', 'Aberta']);
    chips.forEach((chip) => expect(chip).toHaveClass('chip'));
  });

  it('presses only the chip of the current value', () => {
    renderTypeChips('stars');

    expect(screen.getByRole('button', { name: 'Estrelas' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Estrelas' })).toHaveClass('chip--active');
    expect(screen.getByRole('button', { name: 'Nota' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Nota' })).not.toHaveClass('chip--active');
    expect(screen.getByRole('button', { name: 'Aberta' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('presses no chip when the value matches no option', () => {
    renderTypeChips('unknown');

    expect(screen.queryByRole('button', { pressed: true })).not.toBeInTheDocument();
  });

  it('calls onChange with the value of the clicked chip', async () => {
    const user = userEvent.setup();
    const onChange = renderTypeChips('score');

    await user.click(screen.getByRole('button', { name: 'Aberta' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('open');
  });

  it('does not submit a surrounding form when a chip is clicked', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <ChoiceChips label="Tipo de resposta" options={TYPE_OPTIONS} value="score" onChange={vi.fn()} />
      </form>,
    );

    await user.click(screen.getByRole('button', { name: 'Estrelas' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('presses the option whose value is null when the value is null', () => {
    render(<ChoiceChips label="Quando mostrar" options={CONDITION_OPTIONS} value={null} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Sempre' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Só se o aluno tem plano alimentar' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with null when the option whose value is null is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChoiceChips label="Quando mostrar" options={CONDITION_OPTIONS} value="has_meal_plan" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Sempre' }));

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
