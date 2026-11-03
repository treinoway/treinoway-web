import { screen, render } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import Pagination from './Pagination';

describe('Pagination', () => {
  it('renders nothing for a single page', () => {
    const { container } = render(<Pagination page={1} pageCount={1} onPageChange={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the status and disables previous on the first page', async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} pageCount={3} onPageChange={onPageChange} />);

    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Próxima' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables next on the last page and goes back', async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={3} pageCount={3} onPageChange={onPageChange} />);

    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Anterior' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
