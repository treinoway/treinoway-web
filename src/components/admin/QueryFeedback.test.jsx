import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import QueryFeedback from './QueryFeedback';

const baseProps = {
  loading: false,
  error: null,
  loadingLabel: 'Carregando...',
  errorTitle: 'Falhou',
  retryLabel: 'Tentar novamente',
  onRetry: vi.fn(),
};

describe('QueryFeedback', () => {
  it('shows the loading label while loading', () => {
    renderWithRouter(<QueryFeedback {...baseProps} loading />);

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('shows the error with a retry action', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderWithRouter(<QueryFeedback {...baseProps} error={new Error('x')} onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Falhou');
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when the data is ready', () => {
    const { container } = renderWithRouter(<QueryFeedback {...baseProps} />);

    expect(container).toBeEmptyDOMElement();
  });
});
