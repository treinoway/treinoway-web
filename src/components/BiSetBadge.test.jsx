import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/test-utils';
import BiSetBadge from './BiSetBadge';

describe('BiSetBadge', () => {
  it('renders the bi-set label as a static span, never a button', () => {
    render(<BiSetBadge />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Bi-set')).toBeInTheDocument();
    expect(screen.getByText('Bi-set')).toBeInTheDocument();
  });

  it('uses a custom ariaLabel when provided', () => {
    render(<BiSetBadge ariaLabel="Grupo de exercícios" />);
    expect(screen.getByLabelText('Grupo de exercícios')).toBeInTheDocument();
  });
});
