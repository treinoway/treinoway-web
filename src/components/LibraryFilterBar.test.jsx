import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import LibraryFilterBar from './LibraryFilterBar';

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'mine', label: 'Meus' },
  { value: 'general', label: 'Gerais' },
];

describe('LibraryFilterBar', () => {
  it('renders the search input with placeholder and aria-label', () => {
    renderWithRouter(
      <LibraryFilterBar
        searchValue=""
        onSearchChange={vi.fn()}
        searchPlaceholder="Buscar anamnese…"
        searchAriaLabel="Buscar anamnese"
      />,
    );
    expect(screen.getByRole('textbox', { name: 'Buscar anamnese' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Buscar anamnese…')).toBeInTheDocument();
  });

  it('calls onSearchChange when the user types', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    renderWithRouter(
      <LibraryFilterBar
        searchValue=""
        onSearchChange={handleChange}
        searchAriaLabel="Buscar"
      />,
    );
    await user.type(screen.getByRole('textbox', { name: 'Buscar' }), 'abc');
    expect(handleChange).toHaveBeenCalledTimes(3);
  });

  it('renders filter chips when filters are provided', () => {
    renderWithRouter(
      <LibraryFilterBar
        searchValue=""
        onSearchChange={vi.fn()}
        searchAriaLabel="Buscar"
        filters={FILTERS}
        activeFilter="all"
        onFilterChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('tab', { name: /todos/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /meus/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /gerais/i })).toBeInTheDocument();
  });

  it('marks the active filter chip as selected', () => {
    renderWithRouter(
      <LibraryFilterBar
        searchValue=""
        onSearchChange={vi.fn()}
        searchAriaLabel="Buscar"
        filters={FILTERS}
        activeFilter="mine"
        onFilterChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('tab', { name: /meus/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /todos/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onFilterChange with the correct value when a chip is clicked', async () => {
    const user = userEvent.setup();
    const handleFilter = vi.fn();
    renderWithRouter(
      <LibraryFilterBar
        searchValue=""
        onSearchChange={vi.fn()}
        searchAriaLabel="Buscar"
        filters={FILTERS}
        activeFilter="all"
        onFilterChange={handleFilter}
      />,
    );
    await user.click(screen.getByRole('tab', { name: /meus/i }));
    expect(handleFilter).toHaveBeenCalledWith('mine');
  });

  it('renders filter counts when filterCounts is provided', () => {
    renderWithRouter(
      <LibraryFilterBar
        searchValue=""
        onSearchChange={vi.fn()}
        searchAriaLabel="Buscar"
        filters={FILTERS}
        activeFilter="all"
        onFilterChange={vi.fn()}
        filterCounts={{ all: 7, mine: 3, general: 4 }}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Todos (7)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Meus (3)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Gerais (4)' })).toBeInTheDocument();
  });

  it('prefers a per-filter count over filterCounts', () => {
    renderWithRouter(
      <LibraryFilterBar
        searchValue=""
        onSearchChange={vi.fn()}
        searchAriaLabel="Buscar"
        filters={[{ value: 'all', label: 'Todos', count: 9 }]}
        activeFilter="all"
        onFilterChange={vi.fn()}
        filterCounts={{ all: 1 }}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Todos (9)' })).toBeInTheDocument();
  });

  it('renders without filters when filters array is empty', () => {
    renderWithRouter(
      <LibraryFilterBar
        searchValue=""
        onSearchChange={vi.fn()}
        searchAriaLabel="Buscar"
        filters={[]}
      />,
    );
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('uses default placeholder when none provided', () => {
    renderWithRouter(
      <LibraryFilterBar
        searchValue=""
        onSearchChange={vi.fn()}
        searchAriaLabel="Buscar"
      />,
    );
    expect(screen.getByPlaceholderText('Buscar…')).toBeInTheDocument();
  });

  it('renders the sortSelect slot when provided', () => {
    renderWithRouter(
      <LibraryFilterBar
        searchValue=""
        onSearchChange={vi.fn()}
        searchAriaLabel="Buscar"
        sortSelect={
          <select aria-label="Ordenar">
            <option value="name">Nome A–Z</option>
          </select>
        }
      />,
    );
    expect(screen.getByRole('combobox', { name: 'Ordenar' })).toBeInTheDocument();
  });

  it('does not render sortSelect slot when not provided', () => {
    renderWithRouter(
      <LibraryFilterBar
        searchValue=""
        onSearchChange={vi.fn()}
        searchAriaLabel="Buscar"
      />,
    );
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('renders a named search input and every tab label in full', () => {
    renderWithRouter(
      <LibraryFilterBar
        searchValue=""
        onSearchChange={vi.fn()}
        searchAriaLabel="Buscar rotina"
        filters={[{ value: 'ALL', label: 'Todos' }, { value: 'A', label: 'Mobilidade' }]}
        activeFilter="ALL"
        onFilterChange={vi.fn()}
        filterCounts={{ ALL: 0 }}
        filtersAriaLabel="Filtrar"
        sortSelect={<button type="button">Todos os níveis</button>}
      />,
    );
    expect(screen.getByRole('textbox', { name: 'Buscar rotina' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Todos' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Mobilidade' })).toBeInTheDocument();
    expect(screen.queryByText('(0)')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Todos os níveis' })).toBeInTheDocument();
  });

  it('shows the count when it is greater than zero', () => {
    renderWithRouter(
      <LibraryFilterBar
        searchValue=""
        onSearchChange={vi.fn()}
        filters={[{ value: 'ALL', label: 'Todos' }]}
        activeFilter="ALL"
        onFilterChange={vi.fn()}
        filterCounts={{ ALL: 3 }}
      />,
    );
    expect(screen.getByText('(3)')).toBeInTheDocument();
  });
});
