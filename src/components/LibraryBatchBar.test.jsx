import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import LibraryBatchBar from './LibraryBatchBar';

describe('LibraryBatchBar', () => {
  const baseProps = {
    allSelected: false,
    selectedCount: 0,
    onToggleSelectAll: vi.fn(),
    onDelete: vi.fn(),
  };

  it('renders the select-all toggle as a button when nothing is selected', () => {
    renderWithRouter(<LibraryBatchBar {...baseProps} />);
    expect(
      screen.getByRole('button', { name: 'Selecionar todos' }),
    ).toBeInTheDocument();
  });

  it('hides the count and delete action when nothing is selected', () => {
    renderWithRouter(<LibraryBatchBar {...baseProps} />);
    expect(
      screen.queryByRole('button', { name: /excluir selecionados/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/selecionado/i)).not.toBeInTheDocument();
  });

  it('shows the count and delete action once at least one row is selected', () => {
    renderWithRouter(<LibraryBatchBar {...baseProps} selectedCount={3} />);
    expect(screen.getByText('3 selecionados')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /excluir selecionados/i }),
    ).toBeInTheDocument();
  });

  it('uses the singular form for a single selection', () => {
    renderWithRouter(<LibraryBatchBar {...baseProps} selectedCount={1} />);
    expect(screen.getByText('1 selecionado')).toBeInTheDocument();
  });

  it('flips the toggle label to "Limpar seleção" when rows are selected', () => {
    renderWithRouter(
      <LibraryBatchBar {...baseProps} allSelected selectedCount={5} />,
    );
    const toggle = screen.getByRole('button', { name: 'Limpar seleção' });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.queryByRole('button', { name: 'Selecionar todos' }),
    ).not.toBeInTheDocument();
  });

  it('flips the label to "Limpar seleção" on a partial selection too', () => {
    renderWithRouter(<LibraryBatchBar {...baseProps} selectedCount={2} />);
    expect(
      screen.getByRole('button', { name: 'Limpar seleção' }),
    ).toBeInTheDocument();
  });

  it('calls onToggleSelectAll when the select-all toggle is clicked', async () => {
    const user = userEvent.setup();
    const onToggleSelectAll = vi.fn();
    renderWithRouter(
      <LibraryBatchBar {...baseProps} onToggleSelectAll={onToggleSelectAll} />,
    );
    await user.click(screen.getByRole('button', { name: 'Selecionar todos' }));
    expect(onToggleSelectAll).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when the delete action is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderWithRouter(
      <LibraryBatchBar {...baseProps} selectedCount={2} onDelete={onDelete} />,
    );
    await user.click(
      screen.getByRole('button', { name: /excluir selecionados/i }),
    );
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
