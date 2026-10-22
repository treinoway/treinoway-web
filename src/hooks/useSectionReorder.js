import { useRef, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import { sortSections } from '../utils/anamnesisEditor';
import api from '../api/axios';

const moveSection = (sections, sourceId, targetId) => {
  const sourceIndex = sections.findIndex((s) => s.id === sourceId);
  const targetIndex = sections.findIndex((s) => s.id === targetId);
  if (sourceIndex === -1 || targetIndex === -1) return null;
  const reordered = [...sections];
  const [moved] = reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, moved);
  return reordered;
};

/** Native drag & drop reorder of the outline sections (optimistic, rolls back on failure). */
const useSectionReorder = ({ anamnesisId, anamnesis, setAnamnesis, refetch }) => {
  const { showToast } = useToast();
  const dragSourceRef = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);

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

  const handleDrop = async (targetId) => {
    setDragOverId(null);
    const sourceId = dragSourceRef.current;
    dragSourceRef.current = null;
    if (!sourceId || sourceId === targetId) return;
    const reordered = moveSection(sortSections(anamnesis.sections), sourceId, targetId);
    if (reordered) await persistOrder(reordered);
  };

  const getDragHandlers = (sectionId) => ({
    draggable: true,
    onDragStart: () => { dragSourceRef.current = sectionId; },
    onDragOver: (event) => { event.preventDefault(); setDragOverId(sectionId); },
    onDrop: () => handleDrop(sectionId),
    onDragEnd: () => setDragOverId(null),
  });

  return { dragOverId, getDragHandlers };
};

export default useSectionReorder;
