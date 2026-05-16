import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/test-utils';
import RecurrenceTag from './RecurrenceTag';

describe('RecurrenceTag', () => {
  it('renders default monthly label', () => {
    render(<RecurrenceTag recurrence="monthly" />);
    expect(screen.getByText('Mensal')).toBeInTheDocument();
  });

  it('renders quarterly label', () => {
    render(<RecurrenceTag recurrence="quarterly" />);
    expect(screen.getByText('Trimestral')).toBeInTheDocument();
  });

  it('uses provided label when present', () => {
    render(<RecurrenceTag recurrence="monthly" label="Personalizado" />);
    expect(screen.getByText('Personalizado')).toBeInTheDocument();
  });
});
