import { render, screen } from '../../test/test-utils';
import FaixaBadge from './FaixaBadge';

describe('FaixaBadge', () => {
  it.each([
    ['full', '100%', 'badge--brand'],
    ['constant', 'Constante', 'badge--brand'],
    ['steady', 'Em ritmo', 'badge--neutral'],
    ['restarting', 'Retomando', 'badge--warning'],
    ['entering', 'Entrando', 'badge--neutral'],
  ])('shows the %s band as "%s"', (faixa, label, toneClass) => {
    render(<FaixaBadge faixa={faixa} />);
    expect(screen.getByText(label)).toHaveClass('badge--status', toneClass);
  });

  it('shows the 100% band as a solid badge and the other bands as light chips', () => {
    const { rerender } = render(<FaixaBadge faixa="full" />);
    expect(screen.getByText('100%')).toHaveClass('badge--solid');

    rerender(<FaixaBadge faixa="constant" />);
    expect(screen.getByText('Constante')).not.toHaveClass('badge--solid');
  });

  it('renders nothing for an unknown band', () => {
    const { container } = render(<FaixaBadge faixa="unknown" />);
    expect(container).toBeEmptyDOMElement();
  });
});
