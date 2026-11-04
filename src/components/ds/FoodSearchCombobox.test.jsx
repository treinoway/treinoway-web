import { useState } from 'react';
import PropTypes from 'prop-types';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import FoodSearchCombobox from './FoodSearchCombobox';
import { buildFood, buildFoodGroups } from '../../test/nutritionFixtures';

const FOODS = [
  buildFood({ id: 'f1', name: 'Cuscuz de milho cozido', source: 'taco', portion: { label: '1 fatia média', grams: 100 } }),
  buildFood({ id: 'f2', name: 'Tapioca (goma hidratada)', source: 'tbca', portion: { label: '3 col. de sopa', grams: 60 } }),
  buildFood({ id: 'f3', name: 'Salada da casa', source: 'custom', portion: null }),
];

// Controlled host so typing behaves like the page that owns the search state.
const Host = ({ foods = FOODS, loading = false, onPick = vi.fn(), onClose = vi.fn(), onQueryChange = vi.fn(), onGroupChange = vi.fn() }) => {
  const [query, setQuery] = useState('');
  return (
    <FoodSearchCombobox
      foods={foods}
      groups={buildFoodGroups().items}
      loading={loading}
      query={query}
      onQueryChange={(next) => { setQuery(next); onQueryChange(next); }}
      groupId={null}
      onGroupChange={onGroupChange}
      onPick={onPick}
      onClose={onClose}
    />
  );
};

Host.propTypes = {
  foods: PropTypes.array,
  loading: PropTypes.bool,
  onPick: PropTypes.func,
  onClose: PropTypes.func,
  onQueryChange: PropTypes.func,
  onGroupChange: PropTypes.func,
};

describe('FoodSearchCombobox (DS new component)', () => {
  it('renders a labelled combobox that controls a listbox of foods', () => {
    render(<Host />);
    const input = screen.getByRole('combobox', { name: 'Buscar alimento' });
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    const listbox = screen.getByRole('listbox');
    expect(input).toHaveAttribute('aria-controls', listbox.id);
    expect(within(listbox).getAllByRole('option')).toHaveLength(3);
  });

  it('shows each food name with its source: TACO, TBCA or Meus alimentos', () => {
    render(<Host />);
    const [taco, tbca, custom] = screen.getAllByRole('option');
    expect(within(taco).getByText('Cuscuz de milho cozido')).toBeInTheDocument();
    expect(within(taco).getByText('TACO')).toBeInTheDocument();
    expect(within(tbca).getByText('TBCA')).toBeInTheDocument();
    expect(within(custom).getByText('Meus alimentos')).toBeInTheDocument();
  });

  it('shows values per portion by default and per 100 g after switching the view', async () => {
    const user = userEvent.setup();
    render(<Host />);
    const [taco] = screen.getAllByRole('option');
    expect(within(taco).getByText(/Por 1 fatia média \(100 g\)/)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Por 100 g' }));
    expect(within(screen.getAllByRole('option')[0]).getByText(/Por 100 g/)).toBeInTheDocument();
    expect(within(screen.getAllByRole('option')[0]).getByText(/113 kcal/)).toBeInTheDocument();
  });

  it('falls back to per 100 g for foods without a standard portion', () => {
    render(<Host />);
    const custom = screen.getAllByRole('option')[2];
    expect(within(custom).getByText(/Por 100 g/)).toBeInTheDocument();
  });

  it('reports every keystroke through onQueryChange', async () => {
    const user = userEvent.setup();
    const onQueryChange = vi.fn();
    render(<Host onQueryChange={onQueryChange} />);

    await user.type(screen.getByRole('combobox', { name: 'Buscar alimento' }), 'cus');

    expect(onQueryChange).toHaveBeenLastCalledWith('cus');
  });

  it('lists the food groups as filters and reports the picked one', async () => {
    const user = userEvent.setup();
    const onGroupChange = vi.fn();
    render(<Host onGroupChange={onGroupChange} />);

    const chips = screen.getByRole('group', { name: 'Grupo de alimentos' });
    expect(within(chips).getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(chips).getByRole('button', { name: 'Carnes e ovos' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(within(chips).getByRole('button', { name: 'Carnes e ovos' }));

    expect(onGroupChange).toHaveBeenCalledWith('g-carnes');
  });

  it('goes back to every group with "Todos" (null)', async () => {
    const user = userEvent.setup();
    const onGroupChange = vi.fn();
    render(<Host onGroupChange={onGroupChange} />);

    await user.click(screen.getByRole('button', { name: 'Todos' }));

    expect(onGroupChange).toHaveBeenCalledWith(null);
  });

  it('shows the result count above the list', () => {
    render(<Host />);
    expect(screen.getByText('3 alimentos encontrados')).toBeInTheDocument();
  });

  it('uses the singular for a single result', () => {
    render(<Host foods={FOODS.slice(0, 1)} />);
    expect(screen.getByText('1 alimento encontrado')).toBeInTheDocument();
  });

  it('shows the optional heading naming where the food goes', () => {
    render(
      <FoodSearchCombobox
        foods={[]}
        groups={[]}
        query=""
        onQueryChange={vi.fn()}
        onGroupChange={vi.fn()}
        onPick={vi.fn()}
        onClose={vi.fn()}
        heading="Adicionar ao Almoço"
      />,
    );
    expect(screen.getByText('Adicionar ao Almoço')).toBeInTheDocument();
  });

  it('closes with the Cancelar button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Host onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('picks a food by click', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<Host onPick={onPick} />);

    await user.click(screen.getAllByRole('option')[1]);

    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'f2' }));
  });

  describe('keyboard', () => {
    it('ArrowDown/ArrowUp move the active option (aria-activedescendant) and wrap around', async () => {
      const user = userEvent.setup();
      render(<Host />);
      const input = screen.getByRole('combobox', { name: 'Buscar alimento' });
      const options = screen.getAllByRole('option');
      input.focus();

      await user.keyboard('{ArrowDown}');
      expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
      expect(options[0]).toHaveAttribute('aria-selected', 'true');

      await user.keyboard('{ArrowDown}{ArrowDown}');
      expect(input).toHaveAttribute('aria-activedescendant', options[2].id);

      await user.keyboard('{ArrowDown}');
      expect(input).toHaveAttribute('aria-activedescendant', options[0].id);

      await user.keyboard('{ArrowUp}');
      expect(input).toHaveAttribute('aria-activedescendant', options[2].id);
    });

    it('Enter picks the active option', async () => {
      const user = userEvent.setup();
      const onPick = vi.fn();
      render(<Host onPick={onPick} />);
      screen.getByRole('combobox', { name: 'Buscar alimento' }).focus();

      await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

      expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'f2' }));
    });

    it('Enter without an active option picks nothing', async () => {
      const user = userEvent.setup();
      const onPick = vi.fn();
      render(<Host onPick={onPick} />);
      screen.getByRole('combobox', { name: 'Buscar alimento' }).focus();

      await user.keyboard('{Enter}');

      expect(onPick).not.toHaveBeenCalled();
    });

    it('Escape closes the search', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<Host onClose={onClose} />);
      screen.getByRole('combobox', { name: 'Buscar alimento' }).focus();

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('documents the shortcuts in a hint', () => {
      render(<Host />);
      expect(screen.getByText(/↑↓ navega · Enter adiciona com a porção · Esc fecha/)).toBeInTheDocument();
    });
  });

  describe('states', () => {
    it('shows the loading state while searching', () => {
      render(<Host foods={[]} loading />);
      expect(screen.getByText('Buscando…')).toBeInTheDocument();
      expect(screen.queryByText(/Nada com esse nome/)).not.toBeInTheDocument();
    });

    it('shows the empty state pointing to Meus alimentos', () => {
      render(<Host foods={[]} />);
      expect(
        screen.getByText('Nada com esse nome nesse grupo. Tenta outro termo ou cadastra em Meus alimentos.'),
      ).toBeInTheDocument();
      expect(screen.queryAllByRole('option')).toHaveLength(0);
    });

    it('does not show the empty state while loading results', () => {
      render(<Host foods={[]} loading />);
      expect(screen.getByRole('combobox', { name: 'Buscar alimento' })).toBeInTheDocument();
      expect(screen.queryByText(/Nada com esse nome/)).not.toBeInTheDocument();
    });
  });
});
