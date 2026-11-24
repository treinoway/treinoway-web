import { screen, waitFor, render } from '../../test/test-utils';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SessionDetail from './SessionDetail';
import SkeletonRows from '../../components/ds/SkeletonRows';
import Banner from '../../components/ds/Banner';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

vi.mock('../../components/ds/SkeletonRows', () => ({
  default: vi.fn(({ label }) => <div role="status" aria-label={label}>skeleton-spy</div>),
}));

vi.mock('../../components/ds/Banner', () => ({
  default: vi.fn(({ children }) => <div role="alert">{children}</div>),
}));

// Renders the page at /manager/sessions/s1 with a previous history entry to go back to.
const renderSession = () =>
  render(
    <MemoryRouter initialEntries={['/manager/users/u2', '/manager/sessions/s1']} initialIndex={1}>
      <Routes>
        <Route path="/manager/users/:userId" element={<div>User route</div>} />
        <Route path="/manager/sessions/:sessionId" element={<SessionDetail />} />
      </Routes>
    </MemoryRouter>
  );

// Collects the text of a React children prop, flattening arrays and nested elements.
const textOf = (node) => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return textOf(node.props?.children);
};

describe('SessionDetail design-system components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the DS SkeletonRows component while the session request is pending', async () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    renderSession();

    await waitFor(() => expect(SkeletonRows).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/admin/manager/sessions/s1');
    expect(screen.getByText('skeleton-spy')).toBeInTheDocument();
    expect(Banner).not.toHaveBeenCalled();
  });

  it('renders the DS Banner component with tone="error" and the error.userMessage on failure', async () => {
    api.get.mockRejectedValue({ userMessage: 'Falha X' });

    renderSession();

    await waitFor(() => expect(Banner).toHaveBeenCalled());
    const errorCall = Banner.mock.calls.find(([props]) => props.tone === 'error');
    expect(errorCall).toBeDefined();
    expect(textOf(errorCall[0].children)).toContain('Falha X');
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha X');
  });
});
