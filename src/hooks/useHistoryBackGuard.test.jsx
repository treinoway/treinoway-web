import PropTypes from 'prop-types';
import { render } from '../test/test-utils';
import useHistoryBackGuard from './useHistoryBackGuard';

// Mounts the guard
const Harness = ({ active, onIntercept }) => {
  useHistoryBackGuard(active, onIntercept);
  return null;
};

Harness.propTypes = {
  active: PropTypes.bool.isRequired,
  onIntercept: PropTypes.func.isRequired,
};

// Fires the popstate the browser raises after the entry changed to `idx`
const pressBrowserBackTo = (idx) => {
  window.history.replaceState({ idx }, '');
  window.dispatchEvent(new PopStateEvent('popstate', { state: { idx } }));
};

describe('useHistoryBackGuard', () => {
  let routerListener;
  let go;

  beforeEach(() => {
    window.history.replaceState({ idx: 2 }, '');
    routerListener = vi.fn();
    window.addEventListener('popstate', routerListener);
    go = vi.spyOn(window.history, 'go').mockImplementation(() => {});
  });

  afterEach(() => {
    window.removeEventListener('popstate', routerListener);
    go.mockRestore();
  });

  it('PAN-44 swallows browser Back while active, restores the entry and asks the page to confirm', () => {
    const onIntercept = vi.fn();
    render(<Harness active onIntercept={onIntercept} />);

    pressBrowserBackTo(1);

    expect(routerListener).not.toHaveBeenCalled();
    expect(go).toHaveBeenCalledWith(1);
    expect(onIntercept).toHaveBeenCalledTimes(1);
  });

  it('PAN-44 goes back for real only after the page confirms, letting the router see that navigation', () => {
    const onIntercept = vi.fn();
    render(<Harness active onIntercept={onIntercept} />);
    pressBrowserBackTo(1);
    pressBrowserBackTo(2);
    go.mockClear();

    onIntercept.mock.calls[0][0]();
    expect(go).toHaveBeenCalledWith(-1);
    pressBrowserBackTo(1);

    expect(routerListener).toHaveBeenCalledTimes(1);
  });

  it('PAN-44 also guards the forward button', () => {
    const onIntercept = vi.fn();
    render(<Harness active onIntercept={onIntercept} />);

    pressBrowserBackTo(3);

    expect(go).toHaveBeenCalledWith(-1);
    expect(onIntercept).toHaveBeenCalledTimes(1);
  });

  it('lets browser Back through when not active', () => {
    const onIntercept = vi.fn();
    render(<Harness active={false} onIntercept={onIntercept} />);

    pressBrowserBackTo(1);

    expect(routerListener).toHaveBeenCalledTimes(1);
    expect(onIntercept).not.toHaveBeenCalled();
  });
});
