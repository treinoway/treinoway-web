import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import AnamnesisEditorStatus from './AnamnesisEditorStatus';

const renderStatus = (props) => {
  const handlers = { onBack: vi.fn(), onRetry: vi.fn() };
  render(<AnamnesisEditorStatus {...handlers} {...props} />);
  return handlers;
};

describe('AnamnesisEditorStatus', () => {
  it('loading: announces a status and shows no empty/error content', () => {
    renderStatus({ state: 'loading' });
    expect(screen.getByRole('status', { name: 'Carregando anamnese' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Anamnese não encontrada')).not.toBeInTheDocument();
  });

  it('notFound: offers the way back', async () => {
    const user = userEvent.setup();
    const handlers = renderStatus({ state: 'notFound' });
    expect(screen.getByText('Anamnese não encontrada')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voltar para anamneses' }));
    expect(handlers.onBack).toHaveBeenCalledTimes(1);
  });

  it('error: role alert with the message and a retry action', async () => {
    const user = userEvent.setup();
    const handlers = renderStatus({ state: 'error', errorMessage: 'Sem conexão.' });
    expect(screen.getByRole('alert')).toHaveTextContent('Sem conexão.');
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(handlers.onRetry).toHaveBeenCalledTimes(1);
  });
});
