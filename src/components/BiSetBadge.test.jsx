import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import BiSetBadge from './BiSetBadge';

describe('BiSetBadge', () => {
  it('renders the bi-set label as a button when onClick is provided', () => {
    render(<BiSetBadge onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'Bi-set' })).toBeInTheDocument();
  });

  it('renders as a static span when no onClick is provided', () => {
    render(<BiSetBadge />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Bi-set')).toBeInTheDocument();
  });

  it('uses a custom ariaLabel when provided', () => {
    render(<BiSetBadge ariaLabel="Abrir ações do bi-set" onClick={() => {}} />);
    expect(
      screen.getByRole('button', { name: 'Abrir ações do bi-set' })
    ).toBeInTheDocument();
  });

  it('fires onClick when the button is activated', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<BiSetBadge onClick={onClick} />);
    await user.click(screen.getByRole('button', { name: 'Bi-set' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
