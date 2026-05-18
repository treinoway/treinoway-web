import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import LibraryList, { LibraryListRow } from './LibraryList';

describe('LibraryList', () => {
  it('renders children', () => {
    renderWithRouter(
      <LibraryList>
        <LibraryListRow title="Item A" ariaLabel="Abrir Item A" />
        <LibraryListRow title="Item B" ariaLabel="Abrir Item B" />
      </LibraryList>,
    );
    expect(screen.getByText('Item A')).toBeInTheDocument();
    expect(screen.getByText('Item B')).toBeInTheDocument();
  });

  it('shows default empty message when children is empty array', () => {
    renderWithRouter(<LibraryList>{[]}</LibraryList>);
    expect(screen.getByText('Nenhum item encontrado')).toBeInTheDocument();
  });

  it('shows custom empty message', () => {
    renderWithRouter(
      <LibraryList emptyMessage="Sem resultados para essa busca">{[]}</LibraryList>,
    );
    expect(screen.getByText('Sem resultados para essa busca')).toBeInTheDocument();
  });

  it('shows empty message when children is null', () => {
    renderWithRouter(<LibraryList>{null}</LibraryList>);
    expect(screen.getByText('Nenhum item encontrado')).toBeInTheDocument();
  });

  it('shows no-results state with icon when isNoResults is true', () => {
    renderWithRouter(
      <LibraryList isNoResults emptyMessage="Nenhuma rotina encontrada">
        {[]}
      </LibraryList>,
    );
    expect(screen.getByText('Sem resultados')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma rotina encontrada')).toBeInTheDocument();
  });

  it('filters out falsy children when determining emptiness', () => {
    renderWithRouter(
      <LibraryList>
        {null}
        {false}
        {undefined}
      </LibraryList>,
    );
    expect(screen.getByText('Nenhum item encontrado')).toBeInTheDocument();
  });
});

describe('LibraryListRow', () => {
  it('renders title', () => {
    renderWithRouter(<LibraryListRow title="Treino A" ariaLabel="Abrir Treino A" />);
    expect(screen.getByText('Treino A')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    renderWithRouter(
      <LibraryListRow title="Treino A" subtitle="Força · Superior" ariaLabel="Abrir Treino A" />,
    );
    expect(screen.getByText('Força · Superior')).toBeInTheDocument();
  });

  it('does not render subtitle element when not provided', () => {
    renderWithRouter(<LibraryListRow title="Treino A" ariaLabel="Abrir Treino A" />);
    // Only the title span should be in the main area — no rich-row-sub
    expect(screen.queryByText('undefined')).not.toBeInTheDocument();
  });

  it('renders badges node', () => {
    renderWithRouter(
      <LibraryListRow
        title="Treino A"
        ariaLabel="Abrir Treino A"
        badges={<span className="badge badge-blue">Força</span>}
      />,
    );
    expect(screen.getByText('Força')).toBeInTheDocument();
  });

  it('renders stats node', () => {
    renderWithRouter(
      <LibraryListRow
        title="Treino A"
        ariaLabel="Abrir Treino A"
        stats={<span className="stat-chip">12 semanas</span>}
      />,
    );
    expect(screen.getByText('12 semanas')).toBeInTheDocument();
  });

  it('calls onClick when the row is clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    renderWithRouter(
      <LibraryListRow title="Treino A" ariaLabel="Abrir Treino A" onClick={handleClick} />,
    );
    await user.click(screen.getByRole('button', { name: 'Abrir Treino A' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Enter is pressed on the row', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    renderWithRouter(
      <LibraryListRow title="Treino A" ariaLabel="Abrir Treino A" onClick={handleClick} />,
    );
    screen.getByRole('button', { name: 'Abrir Treino A' }).focus();
    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders RowMenu when rowMenuProps provided', async () => {
    const user = userEvent.setup();
    const handleDelete = vi.fn();
    renderWithRouter(
      <LibraryListRow
        title="Treino A"
        ariaLabel="Abrir Treino A"
        rowMenuProps={{
          ariaLabel: 'Ações do Treino A',
          onDelete: handleDelete,
        }}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Ações do Treino A' }));
    expect(screen.getByText('Excluir')).toBeInTheDocument();
  });

  it('does not render RowMenu when rowMenuProps is not provided', () => {
    renderWithRouter(<LibraryListRow title="Treino A" ariaLabel="Abrir Treino A" />);
    expect(screen.queryByRole('button', { name: /ações/i })).not.toBeInTheDocument();
  });
});
