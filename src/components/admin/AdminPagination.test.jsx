import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import AdminPagination from './AdminPagination';

describe('AdminPagination', () => {
  it('renders nothing for a single page', () => {
    const { container } = renderWithRouter(
      <AdminPagination page={1} pageCount={1} onPageChange={vi.fn()} i18nPrefix="adminInvites" />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the page status and navigates between pages', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    renderWithRouter(<AdminPagination page={2} pageCount={3} onPageChange={onPageChange} i18nPrefix="adminInvites" />);

    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    await user.click(screen.getByRole('button', { name: 'Próxima' }));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
  });

  it('disables the edge buttons', () => {
    renderWithRouter(<AdminPagination page={1} pageCount={2} onPageChange={vi.fn()} i18nPrefix="adminInvites" />);

    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
  });
});
