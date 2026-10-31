import { useEffect, useRef, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import { sortSections } from '../utils/anamnesisEditor';
import api from '../api/axios';

const SECTION_ID_ATTRIBUTE = 'data-section-id';
const KEYBOARD_STEP = { ArrowUp: -1, ArrowDown: 1 };

// Moves the source section to the target's position; null when either id is unknown.
const moveSection = (sections, sourceId, targetId) => {
  const sourceIndex = sections.findIndex((s) => s.id === sourceId);
  const targetIndex = sections.findIndex((s) => s.id === targetId);
  if (sourceIndex === -1 || targetIndex === -1) return null;
  const reordered = [...sections];
  const [moved] = reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, moved);
  return reordered;
};

// Finds the id of the outline section under a viewport point, or null.
const sectionIdAtPoint = (x, y) => document.elementFromPoint(x, y)?.closest(`[${SECTION_ID_ATTRIBUTE}]`)?.getAttribute(SECTION_ID_ATTRIBUTE) ?? null;

/**
 * Reorders the outline sections: with a mouse by dragging anywhere on the row (as before), with touch or pen
 * through the grip only (so scrolling the outline keeps working), or by keyboard (Alt + arrow up/down). Optimistic, rolls back on failure.
 * HTML5 drag-and-drop is not used: it never fires on touch screens.
 */
const useSectionReorder = ({ anamnesisId, anamnesis, setAnamnesis, refetch }) => {
  const { showToast } = useToast();
  const [dragOverId, setDragOverId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const stopTrackingRef = useRef(null);

  useEffect(() => () => stopTrackingRef.current?.(), []);

  const persistOrder = async (reordered) => {
    setAnamnesis((prev) => ({ ...prev, sections: reordered.map((s, i) => ({ ...s, order: i })) }));
    try {
      await api.patch(`/trainer/anamneses/${anamnesisId}/sections/reorder`, {
        orderedIds: reordered.map((s) => s.id),
      });
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
      refetch();
    }
  };

  const moveAndPersist = async (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const reordered = moveSection(sortSections(anamnesis.sections), sourceId, targetId);
    if (reordered) await persistOrder(reordered);
  };

  const finishDrag = (sourceId, event) => {
    stopTrackingRef.current?.();
    setDragOverId(null);
    setDraggingId(null);
    moveAndPersist(sourceId, sectionIdAtPoint(event.clientX, event.clientY));
  };

  const startDrag = (sectionId, { cancelDefault = true } = {}) => (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (cancelDefault) event.preventDefault();
    stopTrackingRef.current?.();
    setDraggingId(sectionId);
    const handleMove = (moveEvent) => setDragOverId(sectionIdAtPoint(moveEvent.clientX, moveEvent.clientY));
    const handleUp = (upEvent) => finishDrag(sectionId, upEvent);
    const handleCancel = () => {
      stopTrackingRef.current?.();
      setDragOverId(null);
      setDraggingId(null);
    };
    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    document.addEventListener('pointercancel', handleCancel);
    stopTrackingRef.current = () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
      document.removeEventListener('pointercancel', handleCancel);
      stopTrackingRef.current = null;
    };
  };

  const moveByKeyboard = (sectionId, step) => {
    const ordered = sortSections(anamnesis.sections);
    const index = ordered.findIndex((s) => s.id === sectionId);
    const target = ordered[index + step];
    if (target) moveAndPersist(sectionId, target.id);
  };

  const getGripProps = (sectionId) => ({
    onPointerDown: startDrag(sectionId),
  });

  const startMouseDragFromRow = (sectionId) => (event) => {
    const onControl = event.target.closest?.('button, a, input, textarea, select');
    if (event.pointerType !== 'mouse' || onControl) return;
    startDrag(sectionId, { cancelDefault: false })(event);
  };

  const getRowProps = (sectionId) => ({
    [SECTION_ID_ATTRIBUTE]: sectionId,
    'aria-keyshortcuts': 'Alt+ArrowUp Alt+ArrowDown',
    onPointerDown: startMouseDragFromRow(sectionId),
    onKeyDown: (event) => {
      const step = KEYBOARD_STEP[event.key];
      if (!event.altKey || !step || event.target !== event.currentTarget) return;
      event.preventDefault();
      moveByKeyboard(sectionId, step);
    },
  });

  return { dragOverId, draggingId, getGripProps, getRowProps };
};

export default useSectionReorder;
