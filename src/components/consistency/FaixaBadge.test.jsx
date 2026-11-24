import { render, screen } from '../../test/test-utils';
import FaixaBadge from './FaixaBadge';

describe('FaixaBadge', () => {
  it.each([
    ['full', '100%', 'badge--success'],
    ['constant', 'Constante', 'badge--brand'],
    ['steady', 'Em ritmo', 'badge--neutral'],
    ['restarting', 'Retomando', 'badge--warning'],
    ['entering', 'Entrando', 'badge--neutral'],
  ])('shows the %s band as "%s"', (faixa, label, toneClass) => {
    render(<FaixaBadge faixa={faixa} />);
    expect(screen.getByText(label)).toHaveClass('badge--status', toneClass);
  });

  it('CPD-71 shows the 100% band on the team ranking as the light green DS tag, not a solid pill (AD-062)', () => {
    render(<FaixaBadge faixa="full" />);
    expect(screen.getByText('100%')).toHaveClass('badge', 'badge--success');
    expect(screen.getByText('100%')).not.toHaveClass('badge--solid');
    expect(screen.getByText('100%')).not.toHaveClass('badge--brand');
  });

  it('CPD-34 shows the 100% band as the light DS tag in a championship', () => {
    render(<FaixaBadge faixa="full" variant="tag" />);
    expect(screen.getByText('100%')).toHaveClass('badge--tag', 'badge--success');
    expect(screen.getByText('100%')).not.toHaveClass('badge--solid');
  });

  it('renders nothing for an unknown band', () => {
    const { container } = render(<FaixaBadge faixa="unknown" />);
    expect(container).toBeEmptyDOMElement();
  });
});
