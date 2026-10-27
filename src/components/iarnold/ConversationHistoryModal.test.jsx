import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import ConversationHistoryModal from './ConversationHistoryModal';

const groups = [
  {
    label: 'Hoje',
    conversations: [
      { id: 'c1', title: 'Treino de pernas', updatedAt: '2026-03-01T10:00:00.000Z', preview: 'Quero um treino' },
      { id: 'c2', title: null, updatedAt: '2026-03-01T09:00:00.000Z' },
    ],
  },
];

// Renders the modal with sensible defaults.
const setup = (props = {}) => {
  const handlers = { onClose: vi.fn(), onNew: vi.fn(), onSelect: vi.fn(), onDelete: vi.fn() };
  render(<ConversationHistoryModal groups={groups} loading={false} activeId="c1" loadingId={null} {...handlers} {...props} />);
  return handlers;
};

describe('ConversationHistoryModal', () => {
  it('lists the conversations by date group with the untitled fallback', () => {
    setup();

    const dialog = screen.getByRole('dialog', { name: 'Histórico de conversas' });
    expect(within(dialog).getByRole('heading', { name: 'Hoje' })).toBeInTheDocument();
    expect(within(dialog).getByText('Treino de pernas')).toBeInTheDocument();
    expect(within(dialog).getByText('Quero um treino')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Abrir conversa: Sem título' })).toBeInTheDocument();
  });

  it('renders the date group label in sentence case, not as an overline', () => {
    setup();

    const label = screen.getByRole('heading', { name: 'Hoje' });
    expect(label).toHaveClass('type-caption-strong');
    expect(label).not.toHaveClass('type-overline');
  });

  it('marks the active conversation', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Abrir conversa: Treino de pernas' })).toHaveAttribute('aria-current', 'true');
  });

  it('opens and deletes through the row buttons', async () => {
    const user = userEvent.setup();
    const { onSelect, onDelete } = setup();

    await user.click(screen.getByRole('button', { name: 'Abrir conversa: Treino de pernas' }));
    await user.click(screen.getByRole('button', { name: 'Excluir conversa: Treino de pernas' }));

    expect(onSelect).toHaveBeenCalledWith(groups[0].conversations[0]);
    expect(onDelete).toHaveBeenCalledWith(groups[0].conversations[0]);
  });

  it('starts a new conversation', async () => {
    const user = userEvent.setup();
    const { onNew } = setup();

    await user.click(screen.getByRole('button', { name: 'Iniciar nova conversa' }));

    expect(onNew).toHaveBeenCalled();
  });

  it('shows a loading status instead of the list while loading', () => {
    setup({ loading: true });
    expect(screen.getByRole('status', { name: 'Carregando conversas' })).toBeInTheDocument();
    expect(screen.queryByText('Treino de pernas')).not.toBeInTheDocument();
  });

  it('shows the empty block when there are no conversations', () => {
    setup({ groups: [] });
    expect(screen.getByRole('heading', { name: 'Nenhuma conversa ainda.' })).toBeInTheDocument();
  });

  it('disables the conversation that is being opened', () => {
    setup({ loadingId: 'c1' });
    expect(screen.getByRole('button', { name: 'Abrir conversa: Treino de pernas' })).toBeDisabled();
  });
});
