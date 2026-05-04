import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/test-utils';
import SemanticStatusIcon from './SemanticStatusIcon';

describe('SemanticStatusIcon', () => {
  it('renders with required aria-label', () => {
    render(<SemanticStatusIcon status="success" label="Aderência 75%" />);
    expect(screen.getByLabelText('Aderência 75%')).toBeInTheDocument();
  });

  it('applies success modifier class', () => {
    const { container } = render(<SemanticStatusIcon status="success" label="ok" />);
    expect(container.querySelector('.semantic-status-icon--success')).toBeInTheDocument();
  });

  it('applies warning modifier class', () => {
    const { container } = render(<SemanticStatusIcon status="warning" label="warn" />);
    expect(container.querySelector('.semantic-status-icon--warning')).toBeInTheDocument();
  });

  it('applies danger modifier class', () => {
    const { container } = render(<SemanticStatusIcon status="danger" label="danger" />);
    expect(container.querySelector('.semantic-status-icon--danger')).toBeInTheDocument();
  });

  it('renders an SVG icon', () => {
    const { container } = render(<SemanticStatusIcon status="success" label="ok" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
