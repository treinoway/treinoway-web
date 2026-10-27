import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor, within } from '../../test/test-utils';
import PropTypes from 'prop-types';
import userEvent from '@testing-library/user-event';
import AdvancedTechniquesField from './AdvancedTechniquesField';
import api from '../../api/axios';
import {
  DROP_SET,
  REST_PAUSE,
  CLUSTER_SET,
  OWN_TECHNIQUE,
  makeTechnique,
  techniqueEnvelope,
} from '../../test/advancedTechniqueFixtures';

vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

// Controlled harness: mirrors how ExerciseComposer / ExerciseTemplateForm own the list.
const Harness = ({ initial = [], onChangeSpy = vi.fn() }) => {
  const [value, setValue] = useState(initial);
  return (
    <AdvancedTechniquesField
      value={value}
      onChange={(next) => {
        onChangeSpy(next);
        setValue(next);
      }}
    />
  );
};

Harness.propTypes = {
  initial: PropTypes.array,
  onChangeSpy: PropTypes.func,
};

// Test helper: selectedItems.
const selectedItems = () => within(screen.getByRole('list', { name: 'Técnicas selecionadas' })).getAllByRole('listitem');
// Test helper: namesInOrder.
const namesInOrder = () => selectedItems().map((item) => item.textContent);

// Test helper: openPicker.
const openPicker = async (user) => {
  const combobox = screen.getByRole('combobox', { name: /buscar técnica avançada/i });
  await user.click(combobox);
  return combobox;
};

describe('AdvancedTechniquesField — picker and ordered list (criterion 10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue(techniqueEnvelope([DROP_SET, REST_PAUSE, CLUSTER_SET, OWN_TECHNIQUE]));
  });

  it('does not fetch until the picker is used', () => {
    render(<Harness />);

    expect(api.get).not.toHaveBeenCalled();
  });

  it('lists system and own techniques from GET /trainer/advanced-techniques when the picker opens', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await openPicker(user);

    expect(await screen.findByRole('option', { name: /Drop set/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Tempo 3-1-3/ })).toBeInTheDocument();
    expect(api.get.mock.calls[0][0]).toBe('/trainer/advanced-techniques');
  });

  it('searches by name with the q param', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const combobox = await openPicker(user);
    await user.type(combobox, 'rest');

    await waitFor(() => expect(api.get.mock.calls.at(-1)[1]?.params).toMatchObject({ q: 'rest' }));
  });

  it('shows the empty message when nothing matches', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(techniqueEnvelope([]));
    render(<Harness />);

    await openPicker(user);

    expect(await screen.findByText(/nenhuma técnica encontrada/i)).toBeInTheDocument();
  });

  it('appends a picked technique to the end of the ordered list', async () => {
    const user = userEvent.setup();
    const onChangeSpy = vi.fn();
    render(<Harness initial={[DROP_SET]} onChangeSpy={onChangeSpy} />);

    await openPicker(user);
    await user.click(await screen.findByRole('option', { name: /Rest-pause/ }));

    expect(onChangeSpy).toHaveBeenLastCalledWith([DROP_SET, REST_PAUSE]);
    expect(namesInOrder()).toEqual([expect.stringContaining('Drop set'), expect.stringContaining('Rest-pause')]);
  });

  it('marks already added techniques as unavailable in the picker', async () => {
    const user = userEvent.setup();
    const onChangeSpy = vi.fn();
    render(<Harness initial={[DROP_SET]} onChangeSpy={onChangeSpy} />);

    await openPicker(user);
    await user.click(await screen.findByRole('option', { name: /Drop set/ }));

    expect(onChangeSpy).not.toHaveBeenCalled();
  });

  it('removes a technique with "Remover <nome>"', async () => {
    const user = userEvent.setup();
    const onChangeSpy = vi.fn();
    render(<Harness initial={[DROP_SET, REST_PAUSE]} onChangeSpy={onChangeSpy} />);

    await user.click(screen.getByRole('button', { name: 'Remover Drop set' }));

    expect(onChangeSpy).toHaveBeenLastCalledWith([REST_PAUSE]);
    expect(screen.queryByRole('button', { name: 'Remover Drop set' })).not.toBeInTheDocument();
  });

  it('moves a technique down and up with accessible buttons', async () => {
    const user = userEvent.setup();
    const onChangeSpy = vi.fn();
    render(<Harness initial={[DROP_SET, REST_PAUSE, CLUSTER_SET]} onChangeSpy={onChangeSpy} />);

    await user.click(screen.getByRole('button', { name: 'Mover Drop set para baixo' }));
    expect(onChangeSpy).toHaveBeenLastCalledWith([REST_PAUSE, DROP_SET, CLUSTER_SET]);

    await user.click(screen.getByRole('button', { name: 'Mover Cluster set para cima' }));
    expect(onChangeSpy).toHaveBeenLastCalledWith([REST_PAUSE, CLUSTER_SET, DROP_SET]);
  });

  it('disables "up" on the first item and "down" on the last', () => {
    render(<Harness initial={[DROP_SET, REST_PAUSE]} />);

    expect(screen.getByRole('button', { name: 'Mover Drop set para cima' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mover Rest-pause para baixo' })).toBeDisabled();
  });

  it('shows an empty hint when no technique is selected', () => {
    render(<Harness />);

    expect(screen.getByText(/nenhuma técnica adicionada/i)).toBeInTheDocument();
  });

  it('enforces the maximum of 5: picker and create are disabled and a hint shows', async () => {
    const five = ['a', 'b', 'c', 'd', 'e'].map((id) => makeTechnique({ id, key: null, name: `Técnica ${id}`, isSystem: false }));
    render(<Harness initial={five} />);

    expect(screen.getByRole('combobox', { name: /buscar técnica avançada/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /criar nova técnica/i })).toBeDisabled();
    expect(screen.getByText(/máximo de 5 técnicas/i)).toBeInTheDocument();
  });

  it('re-enables the picker after removing one of five', async () => {
    const user = userEvent.setup();
    const five = ['a', 'b', 'c', 'd', 'e'].map((id) => makeTechnique({ id, key: null, name: `Técnica ${id}`, isSystem: false }));
    render(<Harness initial={five} />);

    await user.click(screen.getByRole('button', { name: 'Remover Técnica e' }));

    expect(screen.getByRole('combobox', { name: /buscar técnica avançada/i })).toBeEnabled();
  });
});

describe('AdvancedTechniquesField — inline create (criterion 11)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue(techniqueEnvelope([DROP_SET]));
  });

  it('opens a small form from "Criar nova técnica"', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /criar nova técnica/i }));

    const form = screen.getByRole('group', { name: 'Nova técnica' });
    expect(within(form).getByLabelText('Nome da técnica')).toBeInTheDocument();
    expect(within(form).getByLabelText('Descrição da técnica')).toBeInTheDocument();
  });

  it('POSTs the new technique and appends it to the list', async () => {
    const user = userEvent.setup();
    const created = makeTechnique({ id: 'tech-new', key: null, name: 'Negativa lenta', description: 'Desce em 5s.', isSystem: false, trainerId: 't1' });
    api.post.mockResolvedValue({ data: created });
    const onChangeSpy = vi.fn();
    render(<Harness initial={[DROP_SET]} onChangeSpy={onChangeSpy} />);

    await user.click(screen.getByRole('button', { name: /criar nova técnica/i }));
    const form = screen.getByRole('group', { name: 'Nova técnica' });
    await user.type(within(form).getByLabelText('Nome da técnica'), 'Negativa lenta');
    await user.type(within(form).getByLabelText('Descrição da técnica'), 'Desce em 5s.');
    await user.click(within(form).getByRole('button', { name: 'Criar técnica' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/advanced-techniques', { name: 'Negativa lenta', description: 'Desce em 5s.' });
    });
    await waitFor(() => expect(onChangeSpy).toHaveBeenLastCalledWith([DROP_SET, created]));
    expect(screen.queryByRole('group', { name: 'Nova técnica' })).not.toBeInTheDocument();
  });

  it('validates name and description before calling the API', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /criar nova técnica/i }));
    await user.click(within(screen.getByRole('group', { name: 'Nova técnica' })).getByRole('button', { name: 'Criar técnica' }));

    expect(api.post).not.toHaveBeenCalled();
    expect(within(screen.getByRole('group', { name: 'Nova técnica' })).getAllByRole('alert').length).toBeGreaterThan(0);
  });

  it('keeps the form open and shows the error when the API fails', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue(Object.assign(new Error('x'), { userMessage: 'Falha ao criar técnica.' }));
    const onChangeSpy = vi.fn();
    render(<Harness onChangeSpy={onChangeSpy} />);

    await user.click(screen.getByRole('button', { name: /criar nova técnica/i }));
    const form = screen.getByRole('group', { name: 'Nova técnica' });
    await user.type(within(form).getByLabelText('Nome da técnica'), 'X');
    await user.type(within(form).getByLabelText('Descrição da técnica'), 'Y');
    await user.click(within(form).getByRole('button', { name: 'Criar técnica' }));

    expect(await screen.findByText('Falha ao criar técnica.')).toBeInTheDocument();
    expect(onChangeSpy).not.toHaveBeenCalled();
  });

  it('closes the form without calling the API on cancel', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /criar nova técnica/i }));
    await user.click(within(screen.getByRole('group', { name: 'Nova técnica' })).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('group', { name: 'Nova técnica' })).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});
