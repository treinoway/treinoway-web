import { render, screen, within } from '../../test/test-utils';
import ShareBar from './ShareBar';

const segments = [
  { id: 'FREE', label: 'Grátis', value: 1 },
  { id: 'PRO', label: 'Pro', value: 3 },
];

// Widths of every segment in document order.
const segmentWidths = (container) =>
  Array.from(container.querySelectorAll('.share-bar__segment')).map((segment) => segment.style.width);

describe('ShareBar', () => {
  it('renders an image with the given accessible label and the share-bar class', () => {
    render(<ShareBar ariaLabel="Treinadores por plano" segments={segments} />);

    expect(screen.getByRole('img', { name: 'Treinadores por plano' })).toHaveClass('share-bar');
  });

  it('sizes each segment as its share of the sum of values', () => {
    const { container } = render(<ShareBar ariaLabel="Planos" segments={segments} />);

    expect(segmentWidths(container)).toEqual(['25%', '75%']);
  });

  it('shows the label of every segment in the legend', () => {
    render(<ShareBar ariaLabel="Planos" segments={segments} />);

    const bar = screen.getByRole('img', { name: 'Planos' });
    expect(within(bar).getByText(/Grátis/)).toBeInTheDocument();
    expect(within(bar).getByText(/Pro/)).toBeInTheDocument();
  });

  it('renders without NaN widths when every value is zero', () => {
    const zero = segments.map((segment) => ({ ...segment, value: 0 }));
    const { container } = render(<ShareBar ariaLabel="Planos" segments={zero} />);

    expect(screen.getByRole('img', { name: 'Planos' })).toBeInTheDocument();
    expect(segmentWidths(container).every((width) => width === '0%')).toBe(true);
    expect(container.innerHTML).not.toContain('NaN');
  });

  it('renders no segments for empty data', () => {
    const { container } = render(<ShareBar ariaLabel="Planos" segments={[]} />);

    expect(screen.getByRole('img', { name: 'Planos' })).toBeInTheDocument();
    expect(container.querySelectorAll('.share-bar__segment')).toHaveLength(0);
  });
});
