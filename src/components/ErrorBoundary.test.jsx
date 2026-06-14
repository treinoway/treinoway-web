import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../test/test-utils';
import ErrorBoundary from './ErrorBoundary';

const Boom = () => {
  throw new Error('render crash');
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Render-time crashes log to console.error via componentDidCatch; silence the noise.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <p>conteúdo ok</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('conteúdo ok')).toBeInTheDocument();
  });

  it('renders the graceful pt-BR fallback with a reload action when a child crashes', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { name: 'Algo deu errado' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeInTheDocument();
  });
});
