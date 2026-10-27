import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import ScrollToLatestPill from './ScrollToLatestPill';

describe('ScrollToLatestPill', () => {
  it('renders with correct copy', () => {
    renderWithRouter(
      <ScrollToLatestPill onClick={() => {}} visible />
    );
    expect(screen.getByText('Ver nova resposta')).toBeInTheDocument();
  });

  it('has aria-label on the button', () => {
    renderWithRouter(
      <ScrollToLatestPill onClick={() => {}} visible />
    );
    expect(
      screen.getByRole('button', { name: 'Ir para a resposta mais recente' })
    ).toBeInTheDocument();
  });

  it('calls onClick when button is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithRouter(
      <ScrollToLatestPill onClick={onClick} visible />
    );
    await user.click(screen.getByRole('button', { name: 'Ir para a resposta mais recente' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is removed from the accessibility tree and the tab order when visible=false', () => {
    renderWithRouter(
      <ScrollToLatestPill onClick={() => {}} visible={false} />
    );
    expect(screen.queryByRole('button', { name: 'Ir para a resposta mais recente' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { hidden: true })).toHaveAttribute('tabindex', '-1');
  });

  it('is exposed and focusable when visible=true', () => {
    renderWithRouter(
      <ScrollToLatestPill onClick={() => {}} visible />
    );
    expect(screen.getByRole('button', { name: 'Ir para a resposta mais recente' })).toHaveAttribute('tabindex', '0');
  });
});
