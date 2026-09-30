import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import AnamnesisMessage from './AnamnesisMessage';

describe('AnamnesisMessage', () => {
  it('renders the title and text and runs the action', async () => {
    const onAction = vi.fn();
    render(<AnamnesisMessage title="Título" text="Texto de apoio" actionLabel="Voltar" onAction={onAction} />);
    expect(screen.getByText('Título')).toBeInTheDocument();
    expect(screen.getByText('Texto de apoio')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Voltar' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
