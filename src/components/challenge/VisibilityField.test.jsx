import { useState } from 'react';
import PropTypes from 'prop-types';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import VisibilityField from './VisibilityField';

// Holds the chosen visibility like the forms do, starting from the field default
const Harness = ({ onChange }) => {
  const [value, setValue] = useState(undefined);
  const handleChange = (next) => {
    onChange(next);
    setValue(next);
  };
  return <VisibilityField value={value} onChange={handleChange} />;
};

Harness.propTypes = { onChange: PropTypes.func.isRequired };

// Option card (the label holding the radio) of a radio
const cardOf = (radio) => radio.closest('label');

describe('VisibilityField', () => {
  it('APP-35 offers Desligado, Só a posição do aluno and Ranking completo ao vivo with full as default', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    const group = screen.getByRole('group', { name: 'Visibilidade no app' });
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(3);
    const off = within(group).getByRole('radio', { name: /Desligado/ });
    const position = within(group).getByRole('radio', { name: /Só a posição do aluno/ });
    const full = within(group).getByRole('radio', { name: /Ranking completo ao vivo/ });
    expect(radios).toEqual([off, position, full]);
    expect(within(cardOf(off)).getByText('O aluno vê só a própria semana.')).toBeInTheDocument();
    expect(within(cardOf(position)).getByText('Vê a própria posição e a faixa, sem a lista.')).toBeInTheDocument();
    expect(within(cardOf(full)).getByText('Vê o pódio, os vizinhos e a lista do campeonato.')).toBeInTheDocument();

    expect(full).toBeChecked();
    expect(off).not.toBeChecked();
    expect(position).not.toBeChecked();
    expect(cardOf(full)).toHaveClass('visibility-option', 'visibility-option--selected');
    expect(cardOf(off)).not.toHaveClass('visibility-option--selected');

    await user.click(screen.getByText('Desligado'));

    expect(onChange).toHaveBeenLastCalledWith('off');
    expect(off).toBeChecked();
    expect(full).not.toBeChecked();
    expect(cardOf(off)).toHaveClass('visibility-option--selected');
    expect(cardOf(full)).not.toHaveClass('visibility-option--selected');

    await user.click(position);

    expect(onChange).toHaveBeenLastCalledWith('position');
    expect(position).toBeChecked();
    expect(off).not.toBeChecked();
  });
});
