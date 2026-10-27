import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import TemplateSearchCombobox from './TemplateSearchCombobox';
import Drawer from '../ds/Drawer';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../api/axios', () => ({ default: { get: vi.fn() } }));

const TEMPLATES = [
  { id: 'a', name: 'Supino reto', type: 'strength' },
  { id: 'b', name: 'Remada curvada', type: 'strength' },
  { id: 'c', name: 'Prancha', type: 'mobility' },
];

// Returns the library search combobox.
const getCombobox = () => screen.getByRole('combobox', { name: 'Buscar na biblioteca' });

describe('TemplateSearchCombobox — keyboard (WAI-ARIA combobox)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: [], total: 0 } });
  });

  it('starts collapsed with aria-controls pointing at the listbox', () => {
    render(<TemplateSearchCombobox templates={TEMPLATES} onPick={vi.fn()} />);
    expect(getCombobox()).toHaveAttribute('aria-expanded', 'false');
    expect(getCombobox()).toHaveAttribute('aria-controls');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('ArrowDown opens the list and moves the active option, updating aria-activedescendant', async () => {
    const user = userEvent.setup();
    render(<TemplateSearchCombobox templates={TEMPLATES} onPick={vi.fn()} />);
    await user.keyboard('{ArrowDown}');
    expect(getCombobox()).toHaveAttribute('aria-expanded', 'true');
    const first = screen.getByRole('option', { name: /Supino reto/ });
    expect(getCombobox()).toHaveAttribute('aria-activedescendant', first.id);
    await user.keyboard('{ArrowDown}');
    expect(getCombobox()).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: /Remada curvada/ }).id);
  });

  it('ArrowUp wraps from the first option to the last', async () => {
    const user = userEvent.setup();
    render(<TemplateSearchCombobox templates={TEMPLATES} onPick={vi.fn()} />);
    await user.keyboard('{ArrowDown}{ArrowUp}');
    expect(getCombobox()).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: /Prancha/ }).id);
  });

  it('Enter picks the active option', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<TemplateSearchCombobox templates={TEMPLATES} onPick={onPick} />);
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onPick).toHaveBeenCalledWith(TEMPLATES[1]);
  });

  it('Enter without an active option picks nothing', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<TemplateSearchCombobox templates={TEMPLATES} onPick={onPick} />);
    await user.type(getCombobox(), 'sup{Enter}');
    expect(onPick).not.toHaveBeenCalled();
  });

  it('Escape closes an open list', async () => {
    const user = userEvent.setup();
    render(<TemplateSearchCombobox templates={TEMPLATES} onPick={vi.fn()} />);
    await user.keyboard('{ArrowDown}{Escape}');
    expect(getCombobox()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('Escape on an open list does not close the surrounding drawer, the next Escape does', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Drawer title="Novo exercício" onClose={onClose}>
        <TemplateSearchCombobox templates={TEMPLATES} onPick={vi.fn()} />
      </Drawer>
    );
    await user.keyboard('{ArrowDown}{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('TemplateSearchCombobox — server search and a11y', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: [], total: 0 } });
  });

  it('adds server-only matches after the local ones, without duplicating shared ones', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({
      data: { data: [TEMPLATES[0], { id: 'z', name: 'Supino inclinado', type: 'strength' }], total: 2 },
    });
    render(<TemplateSearchCombobox templates={TEMPLATES} onPick={vi.fn()} />);

    await user.type(getCombobox(), 'supino');

    expect(await screen.findByRole('option', { name: /Supino inclinado/ })).toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: /Supino reto/ })).toHaveLength(1);
    expect(api.get).toHaveBeenCalledWith('/trainer/exercise-templates', { params: { q: 'supino', limit: 100 } });
  });

  it('picks a server-only result', async () => {
    const user = userEvent.setup();
    const remote = { id: 'z', name: 'Supino inclinado', type: 'strength' };
    api.get.mockResolvedValue({ data: { data: [remote], total: 1 } });
    const onPick = vi.fn();
    render(<TemplateSearchCombobox templates={TEMPLATES} onPick={onPick} />);

    await user.type(getCombobox(), 'inclinado');
    await user.click(await screen.findByRole('option', { name: /Supino inclinado/ }));

    expect(onPick).toHaveBeenCalledWith(remote);
  });

  it('announces the empty state through a polite live region', async () => {
    const user = userEvent.setup();
    render(<TemplateSearchCombobox templates={TEMPLATES} onPick={vi.fn()} />);

    await user.type(getCombobox(), 'zzzz');

    const status = await screen.findByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(await screen.findByText(/Nenhum exercício encontrado/)).toBeInTheDocument();
  });

  it('scrolls the active option into view with block "nearest"', async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
    render(<TemplateSearchCombobox templates={TEMPLATES} onPick={vi.fn()} />);

    await user.keyboard('{ArrowDown}');

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
  });
});
