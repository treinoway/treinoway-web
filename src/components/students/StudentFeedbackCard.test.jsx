import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import StudentFeedbackCard from './StudentFeedbackCard';

describe('StudentFeedbackCard', () => {
  it('is a section named "Feedback" with a level 3 heading', () => {
    render(<StudentFeedbackCard onViewAll={vi.fn()} />);

    const card = screen.getByRole('region', { name: 'Feedback' });
    expect(within(card).getByRole('heading', { level: 3, name: 'Feedback' })).toBeInTheDocument();
  });

  it('says what the trainer finds in the feedback history', () => {
    render(<StudentFeedbackCard onViewAll={vi.fn()} />);

    expect(screen.getByText('Veja o que o aluno respondeu em cada envio e envie um feedback quando quiser.')).toBeInTheDocument();
  });

  it('offers "Ver feedbacks" as a secondary button and does nothing until it is used', () => {
    const onViewAll = vi.fn();
    render(<StudentFeedbackCard onViewAll={onViewAll} />);

    const button = screen.getByRole('button', { name: 'Ver feedbacks' });
    expect(button).toBeEnabled();
    expect(button).toHaveClass('btn', 'btn--secondary');
    expect(button).toHaveAttribute('type', 'button');
    expect(onViewAll).not.toHaveBeenCalled();
  });

  it('calls onViewAll once when "Ver feedbacks" is clicked', async () => {
    const onViewAll = vi.fn();
    const user = userEvent.setup();
    render(<StudentFeedbackCard onViewAll={onViewAll} />);

    await user.click(screen.getByRole('button', { name: 'Ver feedbacks' }));

    expect(onViewAll).toHaveBeenCalledTimes(1);
  });

  it('has a single action, so no row menu', () => {
    render(<StudentFeedbackCard onViewAll={vi.fn()} />);

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
