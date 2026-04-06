import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test/test-utils';
import BonusChipGrid from './BonusChipGrid';

describe('BonusChipGrid', () => {
  it('renders default chips', () => {
    render(<BonusChipGrid onAward={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Conceder 5 pontos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conceder 10 pontos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conceder 25 pontos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conceder 50 pontos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conceder 100 pontos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Outro valor' })).toBeInTheDocument();
  });

  it('calls onAward with chip value on click', async () => {
    const user = userEvent.setup();
    const onAward = vi.fn();
    render(<BonusChipGrid onAward={onAward} />);
    await user.click(screen.getByRole('button', { name: 'Conceder 25 pontos' }));
    expect(onAward).toHaveBeenCalledWith(25, undefined);
  });

  it('shows custom input when Outro is clicked', async () => {
    const user = userEvent.setup();
    render(<BonusChipGrid onAward={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Outro valor' }));
    expect(screen.getByLabelText('Valor personalizado')).toBeInTheDocument();
  });

  it('submits custom value', async () => {
    const user = userEvent.setup();
    const onAward = vi.fn();
    render(<BonusChipGrid onAward={onAward} />);
    await user.click(screen.getByRole('button', { name: 'Outro valor' }));
    const input = screen.getByLabelText('Valor personalizado');
    await user.type(input, '75');
    await user.click(screen.getByRole('button', { name: 'Conceder' }));
    expect(onAward).toHaveBeenCalledWith(75, undefined);
  });

  it('shows error for invalid custom value', async () => {
    const user = userEvent.setup();
    const onAward = vi.fn();
    render(<BonusChipGrid onAward={onAward} />);
    await user.click(screen.getByRole('button', { name: 'Outro valor' }));
    const input = screen.getByLabelText('Valor personalizado');
    await user.type(input, '99999');
    await user.click(screen.getByRole('button', { name: 'Conceder' }));
    expect(onAward).not.toHaveBeenCalled();
    expect(screen.getByText(/entre 1 e 10000/i)).toBeInTheDocument();
  });

  it('passes reason when provided', async () => {
    const user = userEvent.setup();
    const onAward = vi.fn();
    render(<BonusChipGrid onAward={onAward} />);
    await user.click(screen.getByRole('button', { name: /Adicionar motivo/i }));
    const textarea = screen.getByPlaceholderText(/Por que este aluno/i);
    await user.type(textarea, 'Excelente semana');
    await user.click(screen.getByRole('button', { name: 'Conceder 10 pontos' }));
    expect(onAward).toHaveBeenCalledWith(10, 'Excelente semana');
  });

  it('disables chips while disabled', () => {
    render(<BonusChipGrid onAward={vi.fn()} disabled />);
    expect(screen.getByRole('button', { name: 'Conceder 5 pontos' })).toBeDisabled();
  });
});
