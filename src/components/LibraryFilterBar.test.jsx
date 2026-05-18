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
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
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
});
