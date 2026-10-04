import { render } from '../../test/test-utils';
import Avatar from './Avatar';

describe('Avatar', () => {
  it('renders initials and hides them from assistive tech', () => {
    const { container } = render(<Avatar name="Gabriel Almeida" />);
    const avatar = container.querySelector('.avatar');
    expect(avatar).toHaveTextContent('GA');
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders a photo when src is provided', () => {
    const { container } = render(<Avatar name="Gabriel Almeida" src="/photo.png" size="lg" />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/photo.png');
    expect(container.querySelector('.avatar')).toHaveClass('avatar--lg');
  });
});
