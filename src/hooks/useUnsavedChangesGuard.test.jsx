import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PropTypes from 'prop-types';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Link, useLocation } from 'react-router-dom';
import { act, render, screen } from '../test/test-utils';
import useUnsavedChangesGuard from './useUnsavedChangesGuard';

const PAGE_PATH = '/trainer/student-feedbacks/templates/tpl-2';
const LIST_PATH = '/trainer/student-feedbacks/templates';
const STUDENTS_PATH = '/trainer/students';
const CONFIRMATION = {
  message: 'Há mudanças não salvas. Descartar e sair?',
  confirmLabel: 'Descartar',
  busyLabel: 'Saindo...',
  onConfirm: expect.any(Function),
};

// Shows the current path so a test can tell where the guard navigated to
const CurrentPath = () => <p>{`rota: ${useLocation().pathname}`}</p>;

// Page under the guard: a menu link to another page and the page's own exit through `leaveTo`
const GuardedPage = ({ isDirty, requestConfirm }) => {
  const leaveTo = useUnsavedChangesGuard(isDirty, requestConfirm);
  return (
    <>
      <Link to={STUDENTS_PATH}>Menu Alunos</Link>
      <button type="button" onClick={() => leaveTo(LIST_PATH)}>Voltar</button>
    </>
  );
};

GuardedPage.propTypes = {
  isDirty: PropTypes.bool.isRequired,
  requestConfirm: PropTypes.func.isRequired,
};

// The guarded page inside a router, with the given dirty state
const pageWith = (isDirty, requestConfirm) => (
  <MemoryRouter initialEntries={[PAGE_PATH]}>
    <CurrentPath />
    <GuardedPage isDirty={isDirty} requestConfirm={requestConfirm} />
  </MemoryRouter>
);

// Fires the event the browser raises before closing or reloading the tab and tells whether the page asked to be warned
const warnsBeforeUnload = () => {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
};

// Fires the popstate the browser raises after Back moved the session history to the entry `idx`
const pressBrowserBackTo = (idx) => {
  window.history.replaceState({ idx }, '');
  window.dispatchEvent(new PopStateEvent('popstate', { state: { idx } }));
};

// Runs what the confirmation dialog runs when the trainer confirms the last request
const confirmLast = (requestConfirm) => act(() => requestConfirm.mock.calls.at(-1)[0].onConfirm());

describe('useUnsavedChangesGuard', () => {
  let requestConfirm;
  let go;

  beforeEach(() => {
    requestConfirm = vi.fn();
    window.history.replaceState({ idx: 2 }, '');
    go = vi.spyOn(window.history, 'go').mockImplementation(() => {});
  });

  afterEach(() => {
    go.mockRestore();
    window.history.replaceState(null, '');
  });

  describe('closing or reloading the tab', () => {
    it('asks the browser to warn while there are unsaved changes', () => {
      render(pageWith(true, requestConfirm));

      expect(warnsBeforeUnload()).toBe(true);
    });

    it('does not ask the browser to warn while nothing changed', () => {
      render(pageWith(false, requestConfirm));

      expect(warnsBeforeUnload()).toBe(false);
    });

    it('starts warning when the page becomes dirty and stops once it is clean again', () => {
      const { rerender } = render(pageWith(false, requestConfirm));

      rerender(pageWith(true, requestConfirm));
      expect(warnsBeforeUnload()).toBe(true);

      rerender(pageWith(false, requestConfirm));
      expect(warnsBeforeUnload()).toBe(false);
    });

    it('stops warning once the page is gone', () => {
      const { unmount } = render(pageWith(true, requestConfirm));

      unmount();

      expect(warnsBeforeUnload()).toBe(false);
    });

    it('registers one beforeunload listener while dirty and removes that same listener', () => {
      const add = vi.spyOn(window, 'addEventListener');
      const remove = vi.spyOn(window, 'removeEventListener');
      const registered = () => add.mock.calls.filter(([type]) => type === 'beforeunload');
      const removed = () => remove.mock.calls.filter(([type]) => type === 'beforeunload');

      const { rerender } = render(pageWith(false, requestConfirm));
      expect(registered()).toHaveLength(0);

      rerender(pageWith(true, requestConfirm));
      expect(registered()).toHaveLength(1);
      expect(removed()).toHaveLength(0);

      rerender(pageWith(false, requestConfirm));
      expect(removed()).toHaveLength(1);
      expect(removed()[0][1]).toBe(registered()[0][1]);

      add.mockRestore();
      remove.mockRestore();
    });
  });

  describe('the page\'s own exit', () => {
    it('navigates at once when nothing changed', async () => {
      const user = userEvent.setup();
      render(pageWith(false, requestConfirm));

      await user.click(screen.getByRole('button', { name: 'Voltar' }));

      expect(screen.getByText(`rota: ${LIST_PATH}`)).toBeInTheDocument();
      expect(requestConfirm).not.toHaveBeenCalled();
    });

    it('asks to discard the changes and stays on the page until the trainer confirms', async () => {
      const user = userEvent.setup();
      render(pageWith(true, requestConfirm));

      await user.click(screen.getByRole('button', { name: 'Voltar' }));

      expect(requestConfirm).toHaveBeenCalledTimes(1);
      expect(requestConfirm).toHaveBeenCalledWith(CONFIRMATION);
      expect(screen.getByText(`rota: ${PAGE_PATH}`)).toBeInTheDocument();
    });

    it('navigates to the asked path once the trainer confirms', async () => {
      const user = userEvent.setup();
      render(pageWith(true, requestConfirm));
      await user.click(screen.getByRole('button', { name: 'Voltar' }));

      confirmLast(requestConfirm);

      expect(screen.getByText(`rota: ${LIST_PATH}`)).toBeInTheDocument();
    });
  });

  describe('an in-app link', () => {
    it('navigates at once when nothing changed', async () => {
      const user = userEvent.setup();
      render(pageWith(false, requestConfirm));

      await user.click(screen.getByRole('link', { name: 'Menu Alunos' }));

      expect(screen.getByText(`rota: ${STUDENTS_PATH}`)).toBeInTheDocument();
      expect(requestConfirm).not.toHaveBeenCalled();
    });

    it('is held back with the discard question while there are unsaved changes', async () => {
      const user = userEvent.setup();
      render(pageWith(true, requestConfirm));

      await user.click(screen.getByRole('link', { name: 'Menu Alunos' }));

      expect(requestConfirm).toHaveBeenCalledTimes(1);
      expect(requestConfirm).toHaveBeenCalledWith(CONFIRMATION);
      expect(screen.getByText(`rota: ${PAGE_PATH}`)).toBeInTheDocument();
    });

    it('navigates to the path of the link once the trainer confirms', async () => {
      const user = userEvent.setup();
      render(pageWith(true, requestConfirm));
      await user.click(screen.getByRole('link', { name: 'Menu Alunos' }));

      confirmLast(requestConfirm);

      expect(screen.getByText(`rota: ${STUDENTS_PATH}`)).toBeInTheDocument();
    });

    it('navigates at once again after the changes were saved', async () => {
      const user = userEvent.setup();
      const { rerender } = render(pageWith(true, requestConfirm));
      rerender(pageWith(false, requestConfirm));

      await user.click(screen.getByRole('link', { name: 'Menu Alunos' }));

      expect(screen.getByText(`rota: ${STUDENTS_PATH}`)).toBeInTheDocument();
      expect(requestConfirm).not.toHaveBeenCalled();
    });
  });

  describe('browser Back', () => {
    it('is undone and answered with the discard question while there are unsaved changes', () => {
      render(pageWith(true, requestConfirm));

      pressBrowserBackTo(1);

      expect(go).toHaveBeenCalledTimes(1);
      expect(go).toHaveBeenCalledWith(1);
      expect(requestConfirm).toHaveBeenCalledTimes(1);
      expect(requestConfirm).toHaveBeenCalledWith(CONFIRMATION);
    });

    it('goes back for real once the trainer confirms', () => {
      render(pageWith(true, requestConfirm));
      pressBrowserBackTo(1);
      pressBrowserBackTo(2);
      go.mockClear();

      confirmLast(requestConfirm);

      expect(go).toHaveBeenCalledTimes(1);
      expect(go).toHaveBeenCalledWith(-1);
    });

    it('is left alone when nothing changed', () => {
      render(pageWith(false, requestConfirm));

      pressBrowserBackTo(1);

      expect(go).not.toHaveBeenCalled();
      expect(requestConfirm).not.toHaveBeenCalled();
    });

    it('is left alone after the page is gone', () => {
      const { unmount } = render(pageWith(true, requestConfirm));
      unmount();

      pressBrowserBackTo(1);

      expect(go).not.toHaveBeenCalled();
      expect(requestConfirm).not.toHaveBeenCalled();
    });
  });
});
