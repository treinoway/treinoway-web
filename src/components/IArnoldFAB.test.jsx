import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../test/test-utils';
import IArnoldFAB from './IArnoldFAB';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// `aiActionsPerStudent: undefined` means "no limits key at all" (missing plan
// data), which is a distinct case from an explicit 0.
const mockAuth = ({ aiActionsPerStudent, hasPlan = true } = {}) => {
  const limits = aiActionsPerStudent === undefined ? {} : { aiActionsPerStudent };
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 1, platformPlan: hasPlan ? { tier: 'PRO', limits } : undefined },
    hasRole: (role) => role === 'TRAINER',
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth({ aiActionsPerStudent: 3 });
});

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

  describe('plan gate', () => {
    it('renders nothing when the AI quota is an explicit 0 (FREE)', () => {
      mockAuth({ aiActionsPerStudent: 0 });
      const { container } = render(
        <IArnoldFAB label="Perguntar ao iArnold" onClick={() => {}} />,
      );

      expect(screen.queryByRole('button', { name: 'Perguntar ao iArnold' })).not.toBeInTheDocument();
      expect(container).toBeEmptyDOMElement();
    });

    it('renders when the AI quota is null (DIAMOND = unlimited)', () => {
      mockAuth({ aiActionsPerStudent: null });
      render(<IArnoldFAB label="Perguntar ao iArnold" onClick={() => {}} />);

      expect(screen.getByRole('button', { name: 'Perguntar ao iArnold' })).toBeInTheDocument();
    });

    it('renders when the plan data is missing (fail-open)', () => {
      mockAuth({ hasPlan: false });
      render(<IArnoldFAB label="Perguntar ao iArnold" onClick={() => {}} />);

      expect(screen.getByRole('button', { name: 'Perguntar ao iArnold' })).toBeInTheDocument();
    });
  });
});
