import { describe, it, expect, vi } from 'vitest';
import { useRef } from 'react';
import PropTypes from 'prop-types';
import { render, screen } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import useModalBehavior from '../components/ds/useModalBehavior';

// Minimal modal host exercising the hook directly.
const Host = ({ label, onClose, returnFocusSelector }) => {
  const ref = useRef(null);
  useModalBehavior(ref, onClose, { returnFocusSelector });
  return (
    <div ref={ref} role="dialog" aria-label={label} tabIndex={-1}>
      <button type="button">{`${label} botão`}</button>
    </div>
  );
};

Host.propTypes = {
  label: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  returnFocusSelector: PropTypes.string,
};

describe('useModalBehavior', () => {
  it('Esc only closes the modal that holds focus when two are stacked', async () => {
    const user = userEvent.setup();
    const closeBottom = vi.fn();
    const closeTop = vi.fn();
    const { rerender } = render(<Host label="Base" onClose={closeBottom} />);
    rerender(<><Host label="Base" onClose={closeBottom} /><Host label="Topo" onClose={closeTop} /></>);

    await user.keyboard('{Escape}');

    expect(closeTop).toHaveBeenCalledTimes(1);
    expect(closeBottom).not.toHaveBeenCalled();
  });

  it('falls back to returnFocusSelector when the opener is no longer mounted', () => {
    const fallback = document.createElement('button');
    fallback.className = 'fallback-target';
    const opener = document.createElement('button');
    document.body.append(fallback, opener);
    opener.focus();
    const { unmount } = render(<Host label="Modal" onClose={vi.fn()} returnFocusSelector=".fallback-target" />);
    opener.remove();
    unmount();
    expect(fallback).toHaveFocus();
    fallback.remove();
  });

  it('keeps focus on the opener when it is still mounted', () => {
    const fallback = document.createElement('button');
    fallback.className = 'fallback-target';
    const opener = document.createElement('button');
    document.body.append(fallback, opener);
    opener.focus();
    const { unmount } = render(<Host label="Modal" onClose={vi.fn()} returnFocusSelector=".fallback-target" />);
    unmount();
    expect(opener).toHaveFocus();
    fallback.remove();
    opener.remove();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
