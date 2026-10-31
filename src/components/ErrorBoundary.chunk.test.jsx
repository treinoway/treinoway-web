import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../test/test-utils';
import ErrorBoundary from './ErrorBoundary';

// Throws the error a lazy() route raises when its chunk is gone after a deploy.
const StaleChunk = () => {
  throw new Error('Failed to fetch dynamically imported module: https://app/assets/Students-abc.js');
};

describe('ErrorBoundary: stale chunk after a deploy', () => {
  const reload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('location', { ...window.location, reload });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('reloads the page once for a stale chunk', () => {
    render(<ErrorBoundary><StaleChunk /></ErrorBoundary>);

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('shows the fallback instead of looping when it already reloaded', () => {
    sessionStorage.setItem('treinoway.chunkReloadAt', String(Date.now()));

    render(<ErrorBoundary><StaleChunk /></ErrorBoundary>);

    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Algo deu errado' })).toBeInTheDocument();
  });
});
