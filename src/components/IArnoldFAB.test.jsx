import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../test/test-utils';
import IArnoldFAB from './IArnoldFAB';

describe('IArnoldFAB', () => {
  it('renders the label', () => {
    render(<IArnoldFAB label="Perguntar ao iArnold" onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'Perguntar ao iArnold' })).toBeInTheDocument();
  });

  it('applies emphasized modifier when emphasized=true', () => {
    const { container } = render(
      <IArnoldFAB label="Perguntar ao iArnold" emphasized onClick={() => {}} />,
    );
    expect(container.querySelector('.iarnold-fab--emphasized')).toBeInTheDocument();
  });

  it('does not apply emphasized modifier when emphasized=false', () => {
    const { container } = render(
      <IArnoldFAB label="Perguntar ao iArnold" onClick={() => {}} />,
    );
    expect(container.querySelector('.iarnold-fab--emphasized')).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<IArnoldFAB label="Perguntar ao iArnold" onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: 'Perguntar ao iArnold' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<IArnoldFAB label="Perguntar ao iArnold" onClick={onClick} disabled />);

    await user.click(screen.getByRole('button', { name: 'Perguntar ao iArnold' }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
