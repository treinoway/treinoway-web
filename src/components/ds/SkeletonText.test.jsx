import { render, screen } from '../../test/test-utils';
import SkeletonText from './SkeletonText';

describe('SkeletonText', () => {
  it('renders a placeholder line hidden from assistive tech', () => {
    render(<div role="group" aria-label="linha"><SkeletonText typeClass="type-caption" /></div>);
    const line = screen.getByRole('group', { name: 'linha' }).firstChild;
    expect(line).toHaveAttribute('aria-hidden', 'true');
  });

  it('has no readable text', () => {
    render(<div role="group" aria-label="linha"><SkeletonText typeClass="type-h1" width="short" /></div>);
    expect(screen.getByRole('group', { name: 'linha' })).toHaveTextContent(/^\s*$/);
  });
});
