import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '../../test/test-utils';
import StudentFeedbackCard from './StudentFeedbackCard';

const DS = { Badge: 'badge' };
const STATIC_TEXT = 'Veja o que o aluno respondeu em cada envio e envie um feedback quando quiser.';
const STUDENT = { id: 'student-1', name: 'Ana Souza', avatarUrl: null };
const AUTO_ON = { enabled: true, next: { milestone: 'D30', milestoneLabel: 'D30', dueAt: '2026-11-26T12:00:00.000Z' } };
const AUTO_OFF = { enabled: false, next: null };

// Renders the card with the given history and returns its region
const renderCard = (history) => {
  render(<StudentFeedbackCard onViewAll={vi.fn()} history={history} />);
  return screen.getByRole('region', { name: 'Feedback' });
};

describe('StudentFeedbackCard: history payload without `feedbacks`', () => {
  it('shows the auto-send badge and no index when the payload has autoSend but no feedbacks', () => {
    const card = renderCard({ student: STUDENT, hasPending: false, autoSend: AUTO_ON });

    expect(within(card).getByText('Envio automático ativo')).toHaveClass(DS.Badge, 'badge--success');
    expect(card).not.toHaveTextContent(/Último índice geral/);
    expect(card).not.toHaveTextContent(/de 100/);
    expect(within(card).queryByText(STATIC_TEXT)).not.toBeInTheDocument();
  });

  it('shows the "desligado" badge and no index when the sending is off and the payload has no feedbacks', () => {
    const card = renderCard({ student: STUDENT, hasPending: false, autoSend: AUTO_OFF });

    expect(within(card).getByText('Envio automático desligado')).toHaveClass(DS.Badge, 'badge--neutral');
    expect(card).not.toHaveTextContent(/de 100/);
  });

  it('falls back to the static text when the payload has neither autoSend nor feedbacks', () => {
    const card = renderCard({ student: STUDENT, hasPending: false });

    expect(within(card).getByText(STATIC_TEXT)).toBeInTheDocument();
    expect(within(card).queryByText(/Envio automático/)).not.toBeInTheDocument();
    expect(card).not.toHaveTextContent(/de 100/);
  });

  it('falls back to the static text for an empty payload', () => {
    const card = renderCard({});

    expect(within(card).getByText(STATIC_TEXT)).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Ver feedbacks' })).toBeEnabled();
  });

  it('treats `feedbacks: null` like a missing list', () => {
    const card = renderCard({ student: STUDENT, hasPending: false, feedbacks: null, autoSend: AUTO_ON });

    expect(within(card).getByText('Envio automático ativo')).toBeInTheDocument();
    expect(card).not.toHaveTextContent(/de 100/);
  });
});
