import { screen, waitFor, render } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import PagedTable from './PagedTable';

const columns = [{ key: 'name', label: 'Nome' }];
// Renders one row of the test table.
const renderRow = (item) => (
  <tr key={item.id}>
    <td>{item.name}</td>
  </tr>
);

// Renders the table around a fetchPage mock.
const setup = (fetchPage) =>
  render(
    <PagedTable
      fetchPage={fetchPage}
      columns={columns}
      renderRow={renderRow}
      emptyTitle="Nada aqui"
      loadingLabel="Carregando"
    />
  );

describe('PagedTable', () => {
  it('renders the rows and header', async () => {
    setup(vi.fn().mockResolvedValue({ items: [{ id: 1, name: 'Linha 1' }], total: 1 }));

    expect(await screen.findByText('Linha 1')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Nome' })).toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    setup(vi.fn().mockResolvedValue({ items: [], total: 0 }));

    expect(await screen.findByText('Nada aqui')).toBeInTheDocument();
  });

  it('shows the error message', async () => {
    setup(vi.fn().mockRejectedValue({ userMessage: 'Erro x' }));

    expect(await screen.findByText('Erro x')).toBeInTheDocument();
  });

  it('requests the next page when paginating', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ items: [{ id: 1, name: 'Linha 1' }], total: 45 });
    setup(fetchPage);
    await screen.findByText('Linha 1');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Próxima' }));

    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith({ page: 2, pageSize: 20 }));
  });
});
