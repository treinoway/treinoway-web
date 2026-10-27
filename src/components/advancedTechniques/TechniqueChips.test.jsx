import { render, screen } from '../../test/test-utils';
import TechniqueChips from './TechniqueChips';

// Builds a technique ref for the tests.
const tech = (id, name, extra = {}) => ({ id, name, order: 0, isDeleted: false, ...extra });

describe('TechniqueChips', () => {
  it('renders nothing when there are no techniques', () => {
    const { container } = render(<TechniqueChips techniques={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when techniques are absent', () => {
    const { container } = render(<TechniqueChips />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when every technique is deleted', () => {
    const { container } = render(<TechniqueChips techniques={[tech('a', 'Drop set', { isDeleted: true })]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders chips sorted by order', () => {
    const { container } = render(
      <TechniqueChips techniques={[tech('b', 'Rest-pause', { order: 1 }), tech('a', 'Drop set', { order: 0 })]} />,
    );
    const chips = [...container.querySelectorAll('.technique-chip')].map((chip) => chip.textContent);
    expect(chips).toEqual(['Drop set', 'Rest-pause']);
  });

  it('shows two chips plus a +N chip and the full list in the aria-label', () => {
    const { container } = render(
      <TechniqueChips
        techniques={[tech('a', 'Drop set', { order: 0 }), tech('b', 'Rest-pause', { order: 1 }), tech('c', 'Cluster set', { order: 2 }), tech('d', 'Bi-set', { order: 3 })]}
      />,
    );
    expect(screen.getByRole('group', { name: 'Técnicas avançadas: Drop set, Rest-pause, Cluster set, Bi-set' })).toHaveAttribute(
      'title',
      'Técnicas avançadas: Drop set, Rest-pause, Cluster set, Bi-set',
    );
    const chips = [...container.querySelectorAll('.technique-chip')].map((chip) => chip.textContent);
    expect(chips).toEqual(['Drop set', 'Rest-pause', '+2']);
  });

  it('excludes deleted techniques from the count and the label', () => {
    render(
      <TechniqueChips
        techniques={[tech('a', 'Drop set', { order: 0 }), tech('b', 'Old', { order: 1, isDeleted: true }), tech('c', 'Rest-pause', { order: 2 })]}
      />,
    );
    expect(screen.getByRole('group', { name: 'Técnicas avançadas: Drop set, Rest-pause' })).toBeInTheDocument();
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });
});
