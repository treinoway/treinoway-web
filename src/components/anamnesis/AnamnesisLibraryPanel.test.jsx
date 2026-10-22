import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import AnamnesisLibraryPanel from './AnamnesisLibraryPanel';

describe('AnamnesisLibraryPanel', () => {
  it('adds a question of the clicked type with the generic seed text', async () => {
    const user = userEvent.setup();
    const onAddQuestion = vi.fn();
    render(<AnamnesisLibraryPanel onAddQuestion={onAddQuestion} />);
    await user.click(screen.getByRole('button', { name: 'Adicionar pergunta Numérico' }));
    expect(onAddQuestion).toHaveBeenCalledWith({
      text: 'Digite a pergunta…',
      type: 'numeric',
      required: false,
      options: [],
    });
  });

  it('adds a preset with its own text and type', async () => {
    const user = userEvent.setup();
    const onAddQuestion = vi.fn();
    render(<AnamnesisLibraryPanel onAddQuestion={onAddQuestion} />);
    await user.click(screen.getByRole('button', { name: 'Histórico familiar de diabetes' }));
    expect(onAddQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Histórico familiar de diabetes', type: 'dichotomous' }),
    );
  });

  it('disables every tile and preset when disabled', () => {
    render(<AnamnesisLibraryPanel disabled onAddQuestion={vi.fn()} />);
    screen.getAllByRole('button').forEach((button) => expect(button).toBeDisabled());
  });
});
