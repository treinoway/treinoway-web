import { describe, it, expect } from 'vitest';
import { render, screen, within } from '../../test/test-utils';
import ChatMessageList from './ChatMessageList';

// Returns the conversation list.
const list = () => screen.getByRole('list', { name: 'Conversa com iArnold' });

describe('ChatMessageList', () => {
  it('labels each side of the conversation and renders markdown only for iArnold', () => {
    render(
      <ChatMessageList
        userInitials="JS"
        messages={[
          { id: 'a', role: 'user', content: 'Quero **força**' },
          { id: 'b', role: 'assistant', content: 'Use **agachamento**', actionsExecuted: [] },
        ]}
      />
    );

    expect(within(list()).getByText('Você')).toBeInTheDocument();
    expect(within(list()).getByText('iArnold')).toBeInTheDocument();
    expect(screen.getByText('Quero **força**')).toBeInTheDocument();
    expect(screen.getByText('agachamento').tagName).toBe('STRONG');
  });

  it('shows a badge for successful actions only', () => {
    render(
      <ChatMessageList
        userInitials="JS"
        messages={[
          {
            id: 'b',
            role: 'assistant',
            content: 'Feito',
            actionsExecuted: [
              { tool: 'create_training_template', success: true },
              { tool: 'create_exercise_template', success: false },
            ],
          },
        ]}
      />
    );

    expect(screen.getByText('Treino criado')).toBeInTheDocument();
    expect(screen.queryByText('Exercício criado')).not.toBeInTheDocument();
  });

  it('summarises several actions in one badge', () => {
    render(
      <ChatMessageList
        userInitials="JS"
        messages={[
          {
            id: 'b',
            role: 'assistant',
            content: 'Feito',
            actionsExecuted: [
              { tool: 'create_training_template', success: true },
              { tool: 'create_exercise_template', success: true },
            ],
          },
        ]}
      />
    );

    expect(screen.getByText('2 ações executadas')).toBeInTheDocument();
  });

  it('marks the streaming message busy and shows the backend status', () => {
    render(
      <ChatMessageList
        userInitials="JS"
        statusMessage="Criando o treino…"
        messages={[
          { id: 'a', role: 'user', content: 'Crie' },
          { id: 'b', role: 'assistant', content: '', isStreaming: true },
        ]}
      />
    );

    const [, streaming] = within(list()).getAllByRole('listitem');
    expect(streaming).toHaveAttribute('aria-busy', 'true');
    expect(within(streaming).getByText('Criando o treino…')).toBeInTheDocument();
  });
});
