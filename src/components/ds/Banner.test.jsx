import { describe, it, expect } from 'vitest';
import { render, screen, within } from '../../test/test-utils';
import Banner from './Banner';

describe('Banner', () => {
  it('renders the text as a note', () => {
    render(<Banner>O novo valor vale só para novas assinaturas.</Banner>);
    expect(screen.getByRole('note')).toHaveTextContent('O novo valor vale só para novas assinaturas.');
  });

  it('supports the warning tone', () => {
    render(<Banner tone="warning">Atenção</Banner>);
    expect(screen.getByRole('note')).toHaveClass('ds-banner--warning');
  });

  it('announces the error tone as an alert and renders its action', () => {
    render(<Banner tone="error" action={<button type="button">Tentar novamente</button>}>Falhou</Banner>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Falhou');
    expect(within(alert).getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });
});
