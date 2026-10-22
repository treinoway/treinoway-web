import { screen, act } from '@testing-library/react';
import { render } from '../test/test-utils';
import LibraryRefetchIndicator from './LibraryRefetchIndicator';

describe('LibraryRefetchIndicator', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders nothing when inactive', () => {
    render(<LibraryRefetchIndicator active={false} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('appears only after the delay and disappears as soon as it is inactive', () => {
    const { rerender } = render(<LibraryRefetchIndicator active />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.getByRole('status')).toHaveTextContent('Buscando…');

    rerender(<LibraryRefetchIndicator active={false} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
