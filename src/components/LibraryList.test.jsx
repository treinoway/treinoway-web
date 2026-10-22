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

  it('renders badges with their label', () => {
    renderWithRouter(
      <LibraryListRow
        title="Treino A"
        badges={[{ label: 'Força', tone: 'brand' }, { label: 'Vídeo', tone: 'gray' }]}
      />,
    );
    expect(screen.getByText('Força')).toHaveClass('badge--brand');
    expect(screen.getByText('Vídeo')).toHaveClass('badge--neutral');
  });

  it.each([
    ['blue', 'badge--brand'],
    ['primary', 'badge--brand'],
    ['gray', 'badge--neutral'],
    ['green', 'badge--success'],
    ['accent', 'badge--warning'],
    ['error', 'badge--error'],
  ])('maps legacy badge tone %s to %s', (tone, expectedClass) => {
    renderWithRouter(<LibraryListRow title="Treino A" badges={[{ label: 'Etiqueta', tone }]} />);
    expect(screen.getByText('Etiqueta')).toHaveClass(expectedClass);
  });

  it('renders stats labels', () => {
    renderWithRouter(
      <LibraryListRow title="Treino A" stats={[{ label: '12 semanas' }, { label: '3 treinos' }]} />,
    );
    expect(screen.getByText('12 semanas')).toBeInTheDocument();
    expect(screen.getByText('3 treinos')).toBeInTheDocument();
  });

  it('renders the title as plain text when onOpen is not provided', () => {
    renderWithRouter(<LibraryListRow title="Treino A" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onOpen when the title button is clicked', async () => {
    const user = userEvent.setup();
    const handleOpen = vi.fn();
    renderWithRouter(
      <LibraryListRow title="Treino A" ariaLabel="Abrir Treino A" onOpen={handleOpen} />,
    );
    await user.click(screen.getByRole('button', { name: 'Abrir Treino A' }));
    expect(handleOpen).toHaveBeenCalledTimes(1);
  });

  it('calls onOpen when Enter is pressed on the title button', async () => {
    const user = userEvent.setup();
    const handleOpen = vi.fn();
    renderWithRouter(
      <LibraryListRow title="Treino A" ariaLabel="Abrir Treino A" onOpen={handleOpen} />,
    );
    screen.getByRole('button', { name: 'Abrir Treino A' }).focus();
    await user.keyboard('{Enter}');
    expect(handleOpen).toHaveBeenCalledTimes(1);
  });

  it('renders a selection checkbox that does not trigger onOpen', async () => {
    const user = userEvent.setup();
    const handleOpen = vi.fn();
    const handleToggle = vi.fn();
    renderWithRouter(
      <LibraryListRow
        title="Treino A"
        ariaLabel="Abrir Treino A"
        onOpen={handleOpen}
        selectable
        selected={false}
        onToggleSelect={handleToggle}
        selectAriaLabel="Selecionar Treino A"
      />,
    );
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar Treino A' }));
    expect(handleToggle).toHaveBeenCalledTimes(1);
    expect(handleOpen).not.toHaveBeenCalled();
  });

  it('does not render a checkbox when not selectable', () => {
    renderWithRouter(<LibraryListRow title="Treino A" />);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
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

describe('LibraryListRow selectDisabled', () => {
  it('keeps the checkbox but disables it', () => {
    renderWithRouter(
      <LibraryListRow title="Geral" selectable selectDisabled selectAriaLabel="Geral (não pode ser excluída)" />,
    );
    expect(screen.getByRole('checkbox', { name: /geral/i })).toBeDisabled();
  });
});
