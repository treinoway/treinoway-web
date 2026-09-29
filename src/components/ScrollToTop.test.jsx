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

  it('scrolls on every navigation, including a bare synchronous act() flush', () => {
    // Regression coverage for the useEffect -> useLayoutEffect fix (the
    // component now uses useLayoutEffect so the scroll reset lands before
    // the browser paints the new route, avoiding a one-frame flicker on a
    // long page reached from a scrolled-down position).
    //
    // NOTE: jsdom never paints, so "before paint" itself is not observable
    // here — a bare act() in this test environment flushes both layout and
    // passive effects synchronously, so this assertion would pass with
    // either hook. It is kept as a behavioral regression check (the effect
    // still fires and still targets .main-content), not as proof of paint
    // timing; the timing guarantee is a property of useLayoutEffect itself,
    // verifiable only in a real browser (e.g. Playwright + a paint/CLS
    // measurement), which was out of scope here.
    let navigate;
    renderHarness((nav) => { navigate = nav; });
    mainContent.scrollTo.mockClear();

    act(() => {
      navigate('/page-b');
    });

    expect(mainContent.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
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
