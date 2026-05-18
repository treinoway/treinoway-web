import { act } from 'react';
import { MemoryRouter, useNavigate, Routes, Route } from 'react-router-dom';
import { render } from '../test/test-utils';
import ScrollToTop from './ScrollToTop';

// Helper component that exposes navigate to the test
// eslint-disable-next-line react/prop-types
const NavigatorHarness = ({ onReady }) => {
  const navigate = useNavigate();
  onReady(navigate);
  return <div />;
};

const renderHarness = (onReady) => {
  render(
    <MemoryRouter initialEntries={['/page-a']}>
      <ScrollToTop />
      <Routes>
        <Route path="*" element={<NavigatorHarness onReady={onReady} />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('ScrollToTop', () => {
  let mainContent;

  beforeEach(() => {
    mainContent = document.createElement('div');
    mainContent.className = 'main-content';
    // scrollTo is not implemented in jsdom — assign a spy manually
    mainContent.scrollTo = vi.fn();
    document.body.appendChild(mainContent);
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    document.body.removeChild(mainContent);
    vi.restoreAllMocks();
  });

  it('scrolls .main-content to top on pathname change', async () => {
    let navigate;
    renderHarness((nav) => { navigate = nav; });

    await act(async () => {
      navigate('/page-b');
    });

    expect(mainContent.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('does not scroll when only the hash changes', async () => {
    let navigate;
    renderHarness((nav) => { navigate = nav; });

    // Wait for the initial mount effect to settle, then reset the spy so we
    // can assert cleanly on the subsequent navigation.
    await act(async () => {});
    mainContent.scrollTo.mockClear();
    window.scrollTo.mockClear();

    await act(async () => {
      navigate('/page-a#section');
    });

    // scrollTo should not have been called because location.hash is non-empty
    expect(mainContent.scrollTo).not.toHaveBeenCalled();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('falls back to window.scrollTo when .main-content is absent', async () => {
    // Remove the main-content element for this test
    document.body.removeChild(mainContent);

    let navigate;
    renderHarness((nav) => { navigate = nav; });

    await act(async () => {
      navigate('/page-b');
    });

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });

    // Re-attach so afterEach cleanup doesn't throw
    document.body.appendChild(mainContent);
  });

  it('returns null (renders nothing)', () => {
    const { container } = render(
      <MemoryRouter>
        <ScrollToTop />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });
});
