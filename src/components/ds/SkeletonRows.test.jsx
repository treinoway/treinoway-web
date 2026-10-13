import { render, screen } from '../../test/test-utils';
import SkeletonRows from './SkeletonRows';

describe('SkeletonRows', () => {
  it('announces one loading status with the given label', () => {
    render(<SkeletonRows label="Carregando rotinas" />);
    expect(screen.getByRole('status', { name: 'Carregando rotinas' })).toBeInTheDocument();
  });

  it('renders the requested number of rows hidden from assistive tech', () => {
    render(<SkeletonRows label="Carregando sessões" count={2} />);
    const status = screen.getByRole('status', { name: 'Carregando sessões' });
    const rows = Array.from(status.children);
    expect(rows).toHaveLength(2);
    rows.forEach((row) => expect(row).toHaveAttribute('aria-hidden', 'true'));
  });
});
