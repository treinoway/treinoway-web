import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/test-utils';
import EmptyDataMessage from './EmptyDataMessage';

describe('EmptyDataMessage', () => {
  it('renders the title', () => {
    render(<EmptyDataMessage title="Aluno ainda não treinou nesse período" />);
    expect(screen.getByText('Aluno ainda não treinou nesse período')).toBeInTheDocument();
  });

  it('renders the description when provided', () => {
    render(<EmptyDataMessage title="t" description="Tente ampliar a janela" />);
    expect(screen.getByText('Tente ampliar a janela')).toBeInTheDocument();
  });

  it('does not render description when omitted', () => {
    render(<EmptyDataMessage title="t" />);
    expect(screen.queryByText('Tente ampliar a janela')).not.toBeInTheDocument();
  });

  it('renders an action node when provided', () => {
    render(<EmptyDataMessage title="t" action={<button type="button">Ver últimos 12 meses</button>} />);
    expect(screen.getByRole('button', { name: 'Ver últimos 12 meses' })).toBeInTheDocument();
  });

  it('marks the message with role=status for assistive tech', () => {
    render(<EmptyDataMessage title="t" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
