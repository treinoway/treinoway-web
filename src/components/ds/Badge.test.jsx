import { render, screen } from '../../test/test-utils';
import Badge from './Badge';

describe('Badge', () => {
  it('renders status badge with tone modifier by default', () => {
    render(<Badge tone="success">Ativo</Badge>);
    const badge = screen.getByText('Ativo');
    expect(badge).toHaveClass('badge', 'badge--status', 'badge--success');
  });

  it('renders tag variant', () => {
    render(<Badge variant="tag" tone="warning">Sem plano</Badge>);
    expect(screen.getByText('Sem plano')).toHaveClass('badge--tag', 'badge--warning');
  });

  it('falls back to neutral tone', () => {
    render(<Badge>Rascunho</Badge>);
    expect(screen.getByText('Rascunho')).toHaveClass('badge--neutral');
  });
});
