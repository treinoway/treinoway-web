import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Inbox } from 'lucide-react';
import { render } from '../test/test-utils';
import LibraryListView from './LibraryListView';
import { LibraryListRow } from './LibraryList';

const empty = {
  icon: Inbox,
  title: 'Sem itens ainda',
  description: 'Crie o primeiro item.',
  actionLabel: 'Criar primeiro item',
  onAction: vi.fn(),
};

const baseProps = {
  status: 'ready',
  errorTitle: 'Não foi possível carregar os itens',
  onRetry: vi.fn(),
  empty,
  toolbar: <div>toolbar</div>,
  noResultsMessage: 'Nada por aqui.',
};

describe('LibraryListView', () => {
  it('shows the loading screen during the initial load', () => {
    render(<LibraryListView {...baseProps} status="loading" />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(screen.queryByText('toolbar')).not.toBeInTheDocument();
  });

  it('shows an alert with retry on load error', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<LibraryListView {...baseProps} status="error" loadError="Falhou" onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Falhou');
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('shows the empty block with its CTA and no toolbar when the library is empty', async () => {
    const user = userEvent.setup();
    render(<LibraryListView {...baseProps} isEmptyLibrary />);

    expect(screen.getByRole('heading', { name: 'Sem itens ainda' })).toBeInTheDocument();
    expect(screen.queryByText('toolbar')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Criar primeiro item' }));
    expect(empty.onAction).toHaveBeenCalled();
  });

  it('falls through to the list when empty is omitted, even if isEmptyLibrary is set', () => {
    const propsWithoutEmpty = { ...baseProps, empty: undefined };
    render(
      <LibraryListView {...propsWithoutEmpty} isEmptyLibrary>
        <LibraryListRow title="Item um" />
      </LibraryListView>,
    );
    expect(screen.getByText('toolbar')).toBeInTheDocument();
    expect(screen.getByText('Item um')).toBeInTheDocument();
  });

  it('renders toolbar, batch bar, rows and footer when ready', () => {
    render(
      <LibraryListView
        {...baseProps}
        batch={{ allSelected: false, selectedCount: 0, onToggleSelectAll: vi.fn(), onDelete: vi.fn() }}
        footer={{ shown: 1, total: 1, noun: 'item', nounPlural: 'itens', onShowMore: vi.fn() }}
      >
        <LibraryListRow title="Item um" />
      </LibraryListView>,
    );
    expect(screen.getByText('toolbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Selecionar todos' })).toBeInTheDocument();
    expect(screen.getByText('Item um')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Mostrando 1 de 1 item');
  });

  it('shows the no-results block when there are no rows', () => {
    render(<LibraryListView {...baseProps} isNoResults />);
    expect(screen.getByRole('heading', { name: 'Sem resultados' })).toBeInTheDocument();
    expect(screen.getByText('Nada por aqui.')).toBeInTheDocument();
    expect(screen.getByText('toolbar')).toBeInTheDocument();
  });

  it('hides the footer while the server total is 0 (e.g. only a local draft row)', () => {
    render(
      <LibraryListView
        {...baseProps}
        footer={{ shown: 0, total: 0, noun: 'item', nounPlural: 'itens', onShowMore: vi.fn() }}
      >
        <LibraryListRow title="Rascunho" />
      </LibraryListView>,
    );
    expect(screen.getByText('Rascunho')).toBeInTheDocument();
    expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument();
  });

  it('hides the batch bar when batch is null (no selectable rows)', () => {
    render(
      <LibraryListView {...baseProps} batch={null}>
        <LibraryListRow title="Rascunho" />
      </LibraryListView>,
    );
    expect(screen.queryByRole('button', { name: 'Selecionar todos' })).not.toBeInTheDocument();
  });
});
