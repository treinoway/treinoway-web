import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import SubstitutesInline from './SubstitutesInline';

describe('SubstitutesInline', () => {
  it('renders nothing when there are no substitutes', () => {
    const { container } = render(
      <SubstitutesInline substitutes={[]} onToggle={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the first substitute name with prefix when there is exactly one', () => {
    render(
      <SubstitutesInline
        substitutes={[{ id: 's1', name: 'Cadeira extensora' }]}
        onToggle={() => {}}
      />
    );
    expect(screen.getByText('Substituto:')).toBeInTheDocument();
    expect(screen.getByText('Cadeira extensora')).toBeInTheDocument();
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it('shows the first substitute and a +N suffix when there are multiple', () => {
    render(
      <SubstitutesInline
        substitutes={[
          { id: 's1', name: 'Cadeira extensora' },
          { id: 's2', name: 'Leg press' },
          { id: 's3', name: 'Hack' },
        ]}
        onToggle={() => {}}
      />
    );
    expect(screen.getByText('Cadeira extensora')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('reflects the expanded state via aria-expanded', () => {
    const { rerender } = render(
      <SubstitutesInline
        substitutes={[{ id: 's1', name: 'A' }]}
        expanded={false}
        onToggle={() => {}}
      />
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    rerender(
      <SubstitutesInline
        substitutes={[{ id: 's1', name: 'A' }]}
        expanded
        onToggle={() => {}}
      />
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('fires onToggle when clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <SubstitutesInline
        substitutes={[{ id: 's1', name: 'A' }]}
        onToggle={onToggle}
      />
    );
    await user.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
