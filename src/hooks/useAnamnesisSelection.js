import { useState, useEffect } from 'react';
import { sortSections, buildAllQuestions } from '../utils/anamnesisEditor';

/**
 * Selected section/question of the editor. Auto-selects the first section and its first
 * question once the anamnesis loads. `onQuestionOpened` lets the page switch the mobile tab.
 */
const useAnamnesisSelection = (anamnesis, { onQuestionOpened } = {}) => {
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);

  /* Syncs the selection with freshly loaded data (first section / first question). */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!anamnesis) return;
    const sorted = sortSections(anamnesis.sections);
    const section = selectedSectionId === null
      ? sorted[0]
      : sorted.find((s) => s.id === selectedSectionId);
    if (!section) return;
    if (selectedSectionId === null) setSelectedSectionId(section.id);
    if (selectedQuestionId === null && (section.questions ?? []).length > 0) {
      setSelectedQuestionId(section.questions[0].id);
    }
  }, [anamnesis]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSelectSection = (sectionId) => {
    setSelectedSectionId((prev) => (prev === sectionId ? null : sectionId));
    setSelectedQuestionId(null);
  };

  const handleSelectQuestion = (questionId, sectionId) => {
    setSelectedSectionId(sectionId);
    setSelectedQuestionId(questionId);
    onQuestionOpened?.();
  };

  const handleStepQuestion = (direction) => {
    const all = buildAllQuestions(sortSections(anamnesis.sections));
    const next = all[all.findIndex((q) => q.id === selectedQuestionId) + direction];
    if (!next) return;
    setSelectedQuestionId(next.id);
    setSelectedSectionId(next.sectionId);
  };

  return {
    selectedSectionId,
    selectedQuestionId,
    setSelectedSectionId,
    setSelectedQuestionId,
    handleSelectSection,
    handleSelectQuestion,
    handleStepQuestion,
  };
};

export default useAnamnesisSelection;
