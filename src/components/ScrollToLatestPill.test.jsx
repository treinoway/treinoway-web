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

  it('is hidden when visible=false (aria-hidden, tabIndex=-1)', () => {
    renderWithRouter(
      <ScrollToLatestPill onClick={() => {}} visible={false} />
    );
    const wrapper = document.querySelector('.scroll-pill');
    expect(wrapper).toHaveClass('scroll-pill--hidden');
    expect(wrapper).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button', { hidden: true })).toHaveAttribute('tabindex', '-1');
  });

  it('is visible when visible=true (no hidden class, tabIndex=0)', () => {
    renderWithRouter(
      <ScrollToLatestPill onClick={() => {}} visible />
    );
    const wrapper = document.querySelector('.scroll-pill');
    expect(wrapper).not.toHaveClass('scroll-pill--hidden');
    expect(wrapper).toHaveAttribute('aria-hidden', 'false');
    expect(screen.getByRole('button', { name: 'Ir para a resposta mais recente' })).toHaveAttribute('tabindex', '0');
  });

  it('renders accent dot', () => {
    renderWithRouter(
      <ScrollToLatestPill onClick={() => {}} visible />
    );
    expect(document.querySelector('.scroll-pill__dot--accent')).toBeInTheDocument();
  });
});
