import { render } from '@testing-library/react';
import GoogleIcon from './GoogleIcon';

describe('GoogleIcon', () => {
  it('renders an SVG element', () => {
    const { container } = render(<GoogleIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('viewBox', '0 0 48 48');
  });
});
