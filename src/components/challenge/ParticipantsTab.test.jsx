import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, within, waitFor } from '../../test/test-utils';
import ParticipantsTab from './ParticipantsTab';
import { useToast } from '../../contexts/ToastContext';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));

// Participant as GET /trainer/challenges/:id/participants returns it
const participant = (studentId, firstName, lastName) => ({ id: `p-${studentId}`, studentId, firstName, lastName, avatarUrl: null, addedAt: '2026-09-01T12:00:00Z' });

const PARTICIPANTS = [participant('s1', 'Juliana', 'Mendes'), participant('s2', 'Pedro', 'Santos')];
const STUDENTS = [
  { id: 's1', firstName: 'Juliana', lastName: 'Mendes' },
  { id: 's2', firstName: 'Pedro', lastName: 'Santos' },
  { id: 's3', firstName: 'Lucas', lastName: 'Ferreira' },
  { id: 's4', firstName: 'Ana', lastName: 'Costa' },
];

// Renders the tab with spies for adding and removing
const renderTab = (props = {}) => {
  const handlers = { onAdd: vi.fn().mockResolvedValue(true), onRemove: vi.fn().mockResolvedValue(undefined) };
  render(<ParticipantsTab participants={PARTICIPANTS} pointsByStudent={{ s1: 486, s2: 412 }} students={STUDENTS} {...handlers} {...props} />);
  return handlers;
};

describe('ParticipantsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue({ showToast: vi.fn() });
  });

  it('CPD-40 lists participants with entry date and points and adds or removes them', async () => {
    const user = userEvent.setup();
    const { onAdd, onRemove } = renderTab();

    expect(screen.getByText('Participantes')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '2 alunos no campeonato' })).toBeInTheDocument();
    const rows = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('Juliana Mendes')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Entrou em 01/09/2026 · 486 pts')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Entrou em 01/09/2026 · 412 pts')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 2 de 2 participantes')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Adicionar participantes' }));
    const sheet = screen.getByRole('dialog', { name: 'Adicionar participantes' });
    expect(within(sheet).getAllByRole('checkbox')).toHaveLength(2);
    expect(within(sheet).queryByText('Juliana Mendes')).not.toBeInTheDocument();
    await user.click(within(sheet).getByRole('checkbox', { name: 'Lucas Ferreira' }));
    await user.click(within(sheet).getByRole('button', { name: 'Adicionar' }));
    expect(onAdd).toHaveBeenCalledWith(['s3']);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Adicionar participantes' })).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Remover Pedro Santos' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('Remover Pedro Santos do campeonato?');
    await user.click(within(dialog).getByRole('button', { name: 'Remover' }));
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ studentId: 's2' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('CPD-40 keeps the participant when the removal is cancelled', async () => {
    const user = userEvent.setup();
    const { onRemove } = renderTab();

    await user.click(screen.getByRole('button', { name: 'Remover Juliana Mendes' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('CPD-40 keeps the add sheet open when adding fails', async () => {
    const user = userEvent.setup();
    renderTab({ onAdd: vi.fn().mockResolvedValue(false) });

    await user.click(screen.getByRole('button', { name: 'Adicionar participantes' }));
    const sheet = screen.getByRole('dialog', { name: 'Adicionar participantes' });
    await user.click(within(sheet).getByRole('checkbox', { name: 'Ana Costa' }));
    await user.click(within(sheet).getByRole('button', { name: 'Adicionar' }));

    expect(screen.getByRole('dialog', { name: 'Adicionar participantes' })).toBeInTheDocument();
    expect(within(sheet).getByRole('checkbox', { name: 'Ana Costa' })).toBeChecked();
  });

  it('shows the participants read-only, without add nor remove', () => {
    renderTab({ readOnly: true });

    expect(screen.queryByRole('button', { name: 'Adicionar participantes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remover/ })).not.toBeInTheDocument();
    expect(screen.getByText('Entrou em 01/09/2026 · 486 pts')).toBeInTheDocument();
  });

  it('shows the empty state with Adicionar participantes', () => {
    renderTab({ participants: [] });

    expect(screen.getByRole('heading', { name: '0 alunos no campeonato' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nenhum participante.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicionar participantes' })).toBeInTheDocument();
  });
});
