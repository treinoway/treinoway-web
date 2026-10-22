import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test/test-utils';
import LibraryFooter from './LibraryFooter';

const baseProps = { noun: 'rotina', nounPlural: 'rotinas', onShowMore: vi.fn() };

describe('LibraryFooter', () => {
  it('shows the summary and "Ver mais" while there is more to load', async () => {
    const user = userEvent.setup();
    const onShowMore = vi.fn();
    render(<LibraryFooter {...baseProps} shown={20} total={45} onShowMore={onShowMore} />);

    expect(screen.getByRole('status')).toHaveTextContent('Mostrando 20 de 45 rotinas');
    await user.click(screen.getByRole('button', { name: 'Ver mais' }));
    expect(onShowMore).toHaveBeenCalledOnce();
  });

  it('hides "Ver mais" when everything is shown and uses the singular noun', () => {
    render(<LibraryFooter {...baseProps} shown={1} total={1} />);
    expect(screen.getByRole('status')).toHaveTextContent('Mostrando 1 de 1 rotina');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('disables the button and shows the loading label while loading more', () => {
    render(<LibraryFooter {...baseProps} shown={20} total={45} loading />);
    expect(screen.getByRole('button', { name: 'Carregando...' })).toBeDisabled();
  });
});
