import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '../test/test-utils';
import useSectionReorder from './useSectionReorder';
import api from '../api/axios';
import { useToast } from '../contexts/ToastContext';

vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../api/axios', () => ({ default: { patch: vi.fn() } }));

const SECTIONS = [
  { id: 's1', title: 'Saúde', order: 0 },
  { id: 's2', title: 'Treino', order: 1 },
  { id: 's3', title: 'Rotina', order: 2 },
];

const showToast = vi.fn();
const setAnamnesis = vi.fn();
const refetch = vi.fn();

// Renders the hook over the three-section outline.
const renderReorder = () => renderHook(() => useSectionReorder({
  anamnesisId: 'a1',
  anamnesis: { sections: SECTIONS },
  setAnamnesis,
  refetch,
}));

// Dispatches a pointer event on the document, as the browser does for touch, pen and mouse.
const firePointer = (type, point = {}) => {
  const event = new Event(type, { bubbles: true });
  Object.assign(event, { clientX: 0, clientY: 0, ...point });
  document.dispatchEvent(event);
};

// Makes elementFromPoint answer with a row carrying this section id.
const stubSectionUnderPointer = (sectionId) => {
  const row = document.createElement('div');
  row.setAttribute('data-section-id', sectionId);
  document.elementFromPoint = vi.fn(() => row);
};

describe('useSectionReorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast });
    api.patch.mockResolvedValue({});
  });

  afterEach(() => {
    delete document.elementFromPoint;
  });

  it('reorders when a section is dragged by the grip onto another, with touch pointers', async () => {
    const { result } = renderReorder();
    stubSectionUnderPointer('s3');

    act(() => result.current.getGripProps('s1').onPointerDown({ pointerType: 'touch', preventDefault: vi.fn() }));
    act(() => firePointer('pointermove'));
    expect(result.current.dragOverId).toBe('s3');
    act(() => firePointer('pointerup'));

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/trainer/anamneses/a1/sections/reorder', {
      orderedIds: ['s2', 's3', 's1'],
    }));
    expect(result.current.draggingId).toBeNull();
  });

  it('with a mouse, also starts the drag from anywhere on the row, but not from its buttons', () => {
    const { result } = renderReorder();
    const row = document.createElement('div');
    const button = document.createElement('button');
    row.appendChild(button);

    act(() => result.current.getRowProps('s1').onPointerDown({ pointerType: 'mouse', button: 0, target: button, preventDefault: vi.fn() }));
    expect(result.current.draggingId).toBeNull();
    act(() => result.current.getRowProps('s1').onPointerDown({ pointerType: 'mouse', button: 0, target: row, preventDefault: vi.fn() }));

    expect(result.current.draggingId).toBe('s1');
  });

  it('with touch, the row never starts a drag (so the outline still scrolls); only the grip does', () => {
    const { result } = renderReorder();
    const row = document.createElement('div');

    act(() => result.current.getRowProps('s1').onPointerDown({ pointerType: 'touch', target: row, preventDefault: vi.fn() }));

    expect(result.current.draggingId).toBeNull();
  });

  it('does nothing when released over the section it started from', () => {
    const { result } = renderReorder();
    stubSectionUnderPointer('s1');

    act(() => result.current.getGripProps('s1').onPointerDown({ pointerType: 'touch', preventDefault: vi.fn() }));
    act(() => firePointer('pointerup'));

    expect(api.patch).not.toHaveBeenCalled();
  });

  it('drops the gesture on pointercancel without saving', () => {
    const { result } = renderReorder();

    act(() => result.current.getGripProps('s1').onPointerDown({ pointerType: 'touch', preventDefault: vi.fn() }));
    act(() => firePointer('pointercancel'));

    expect(result.current.draggingId).toBeNull();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('moves a section down with Alt + ArrowDown', async () => {
    const { result } = renderReorder();
    const row = document.createElement('div');

    act(() => result.current.getRowProps('s1').onKeyDown({
      key: 'ArrowDown', altKey: true, target: row, currentTarget: row, preventDefault: vi.fn(),
    }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/trainer/anamneses/a1/sections/reorder', {
      orderedIds: ['s2', 's1', 's3'],
    }));
  });

  it('ignores arrows without Alt and arrows past the ends', () => {
    const { result } = renderReorder();
    const row = document.createElement('div');
    const press = (sectionId, key, altKey) => result.current.getRowProps(sectionId).onKeyDown({
      key, altKey, target: row, currentTarget: row, preventDefault: vi.fn(),
    });

    act(() => press('s1', 'ArrowDown', false));
    act(() => press('s1', 'ArrowUp', true));

    expect(api.patch).not.toHaveBeenCalled();
  });

  it('shows the error and refetches when saving fails', async () => {
    const error = new Error('Server Error');
    error.userMessage = 'Falha ao salvar.';
    api.patch.mockRejectedValue(error);
    const { result } = renderReorder();
    const row = document.createElement('div');

    act(() => result.current.getRowProps('s2').onKeyDown({
      key: 'ArrowUp', altKey: true, target: row, currentTarget: row, preventDefault: vi.fn(),
    }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Falha ao salvar.', 'error'));
    expect(refetch).toHaveBeenCalled();
  });
});
