import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import LoadState from './LoadState';

describe('LoadState', () => {
  it('shows the loading text', () => {
    render(<LoadState loading error={null} onRetry={vi.fn()}>content</LoadState>);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });

  it('shows the error with a retry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<LoadState loading={false} error="Erro interno." onRetry={onRetry}>content</LoadState>);
    expect(screen.getByText('Erro interno.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders the children once loaded', () => {
    render(<LoadState loading={false} error={null} onRetry={vi.fn()}>content</LoadState>);
    expect(screen.getByText('content')).toBeInTheDocument();
  });
});
