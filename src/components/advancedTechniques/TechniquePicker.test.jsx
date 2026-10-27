import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import TechniquePicker from './TechniquePicker';
import { listAdvancedTechniques } from '../../api/advancedTechniques';
import { DROP_SET, REST_PAUSE } from '../../test/advancedTechniqueFixtures';

vi.mock('../../api/advancedTechniques');

// Renders the picker inside a parent form (spy on its submit) and returns the handlers.
const renderPicker = (props = {}) => {
  const onSelect = vi.fn();
  const onParentSubmit = vi.fn((event) => event.preventDefault());
  render(
    <form onSubmit={onParentSubmit}>
      <TechniquePicker addedIds={[]} onSelect={onSelect} {...props} />
    </form>,
  );
  return { onSelect, onParentSubmit };
};

describe('TechniquePicker', () => {
  beforeEach(() => {
    vi.mocked(listAdvancedTechniques).mockReset();
    listAdvancedTechniques.mockResolvedValue({ data: [DROP_SET, REST_PAUSE] });
  });

  it('does not fetch until focused, then lists the options', async () => {
    renderPicker();
    expect(listAdvancedTechniques).not.toHaveBeenCalled();

    await userEvent.setup().click(screen.getByRole('combobox', { name: 'Buscar técnica avançada' }));
    expect(await screen.findByRole('option', { name: /drop set/i })).toBeInTheDocument();
  });

  it('selects the active option with the keyboard without submitting the host form', async () => {
    const user = userEvent.setup();
    const { onSelect, onParentSubmit } = renderPicker();
    await user.click(screen.getByRole('combobox'));
    await screen.findByRole('option', { name: /drop set/i });

    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith(DROP_SET);
    expect(onParentSubmit).not.toHaveBeenCalled();
  });

  it('marks already added techniques and ignores clicks on them', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderPicker({ addedIds: [DROP_SET.id] });
    await user.click(screen.getByRole('combobox'));
    const added = await screen.findByRole('option', { name: /drop set/i });

    expect(added).toHaveAttribute('aria-disabled', 'true');
    expect(added).toHaveTextContent('Adicionado');
    await user.click(added);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows the empty message', async () => {
    listAdvancedTechniques.mockResolvedValue({ data: [] });
    renderPicker();
    await userEvent.setup().click(screen.getByRole('combobox'));
    expect(await screen.findByText('Nenhuma técnica encontrada.')).toBeInTheDocument();
  });

  it('shows the error message', async () => {
    listAdvancedTechniques.mockRejectedValue({ userMessage: 'Falha na busca' });
    renderPicker();
    await userEvent.setup().click(screen.getByRole('combobox'));
    await waitFor(() => expect(screen.getByText('Falha na busca')).toBeInTheDocument());
  });

  it('is disabled when disabled', () => {
    renderPicker({ disabled: true });
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});
