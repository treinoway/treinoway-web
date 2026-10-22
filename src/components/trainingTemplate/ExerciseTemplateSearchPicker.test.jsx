import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import ExerciseTemplateSearchPicker from './ExerciseTemplateSearchPicker';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({ default: { get: vi.fn() } }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));

const initial = [
  { id: 20, name: 'Supino Reto', type: 'strength' },
  { id: 21, name: 'Corrida', type: 'cardio' },
];

const renderPicker = (props = {}) => {
  const onSelect = vi.fn();
  render(<ExerciseTemplateSearchPicker initialExercises={initial} onSelect={onSelect} {...props} />);
  return { onSelect, user: userEvent.setup() };
};

describe('ExerciseTemplateSearchPicker', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.get.mockResolvedValue({ data: { data: [{ id: 77, name: 'Agachamento Livre', type: 'strength' }] } });
  });

  it('shows the initial exercises when focused with an empty query', async () => {
    const { user } = renderPicker();
    const input = screen.getByRole('combobox', { name: 'Adicionar exercício' });
    expect(input).toHaveAttribute('aria-expanded', 'false');
    await user.click(input);
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('searches the full library when typing and adds the clicked result', async () => {
    const { user, onSelect } = renderPicker();
    await user.type(screen.getByRole('combobox'), 'agach');
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/trainer/exercise-templates', { params: { q: 'agach', limit: 100 } }),
    );
    await user.click(await screen.findByRole('option', { name: /agachamento livre/i }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 77 }));
    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
  });

  it('supports keyboard navigation, Enter to select and Escape to close', async () => {
    const { user, onSelect } = renderPicker();
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: /corrida/i }).id);
    await user.keyboard('{ArrowUp}{Enter}');
    expect(onSelect).toHaveBeenCalledWith(initial[0]);

    await user.click(input);
    await user.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('marks already-added exercises as disabled and does not select them', async () => {
    const { user, onSelect } = renderPicker({ addedIds: [20] });
    await user.click(screen.getByRole('combobox'));
    const added = screen.getByRole('option', { name: /supino reto/i });
    expect(added).toHaveAttribute('aria-disabled', 'true');
    expect(added).toHaveTextContent('Adicionado');
    await user.click(added);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows an empty message when the search has no results', async () => {
    api.get.mockResolvedValue({ data: { data: [] } });
    const { user } = renderPicker();
    await user.type(screen.getByRole('combobox'), 'zzz');
    expect(await screen.findByText('Nenhum exercício encontrado')).toBeInTheDocument();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });
});
