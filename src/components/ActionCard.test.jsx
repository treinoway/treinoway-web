import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Trophy } from 'lucide-react';
import { renderWithRouter } from '../test/test-utils';
import ActionCard from './ActionCard';

describe('ActionCard', () => {
  it('renders title and description', () => {
    renderWithRouter(
      <ActionCard icon={Trophy} title="Campeonatos" description="Veja os campeonatos" to="/trainer/challenges" />
    );

    expect(screen.getByText('Campeonatos')).toBeInTheDocument();
    expect(screen.getByText('Veja os campeonatos')).toBeInTheDocument();
  });

  it('renders as a Link when `to` is provided', () => {
    renderWithRouter(
      <ActionCard icon={Trophy} title="Campeonatos" description="Veja os campeonatos" to="/trainer/challenges" />
    );

    expect(screen.getByRole('link', { name: /campeonatos/i })).toHaveAttribute('href', '/trainer/challenges');
  });

  it('renders as a button and calls onClick when `to` is not provided', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    renderWithRouter(
      <ActionCard icon={Trophy} title="Criar rotina" description="Monte uma rotina" onClick={handleClick} />
    );

    await user.click(screen.getByRole('button', { name: /criar rotina/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading label and disables the button while loading', () => {
    renderWithRouter(
      <ActionCard icon={Trophy} title="Criar rotina" description="Monte uma rotina" onClick={vi.fn()} loading />
    );

    const button = screen.getByRole('button', { name: /carregando/i });
    expect(button).toBeDisabled();
  });

  it('disables the button when disabled is true', () => {
    renderWithRouter(
      <ActionCard icon={Trophy} title="Criar rotina" description="Monte uma rotina" onClick={vi.fn()} disabled />
    );

    expect(screen.getByRole('button', { name: /criar rotina/i })).toBeDisabled();
  });

  it('applies the primary highlight class for variant="primary"', () => {
    const { container } = renderWithRouter(
      <ActionCard icon={Trophy} title="Criar rotina" description="Monte uma rotina" onClick={vi.fn()} variant="primary" />
    );

    expect(container.querySelector('.quick-action-card--highlight')).toBeInTheDocument();
  });

  it('applies the AI outline class for variant="ai" without special icon/label/desc coloring', () => {
    const { container } = renderWithRouter(
      <ActionCard icon={Trophy} title="iArnold" description="IA" to="/trainer/ai-assistant" variant="ai" />
    );

    expect(container.querySelector('.quick-action-card--ai')).toBeInTheDocument();
    expect(container.querySelector('.quick-action-icon--ai')).not.toBeInTheDocument();
  });
});
