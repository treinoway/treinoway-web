import { useState, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

/** Question create / delete and the canvas "updated" signal for the anamnesis editor. */
const useAnamnesisQuestions = ({
  anamnesisId,
  refetch,
  reportError,
  requestConfirm,
  selection,
  onQuestionCreated,
  onConflict,
}) => {
  const { showToast } = useToast();
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [justCreatedQuestionId, setJustCreatedQuestionId] = useState(null);
  const { setSelectedQuestionId } = selection;

  const handleAddQuestion = async (sectionId, payload) => {
    if (!sectionId) {
      showToast('Selecione uma seção antes de adicionar uma pergunta.', 'error');
      return;
    }
    setAddingQuestion(true);
    try {
      const response = await api.post(
        `/trainer/anamneses/${anamnesisId}/sections/${sectionId}/questions`,
        payload,
      );
      showToast('Pergunta adicionada com sucesso!', 'success');
      await refetch();
      const newId = response.data?.id;
      if (newId) {
        setSelectedQuestionId(newId);
        setJustCreatedQuestionId(newId);
      }
      onQuestionCreated();
    } catch (error) {
      reportError(error);
    } finally {
      setAddingQuestion(false);
    }
  };

  const deleteQuestion = async (section, question) => {
    try {
      await api.delete(
        `/trainer/anamneses/${anamnesisId}/sections/${section.id}/questions/${question.id}`,
      );
      showToast('Pergunta excluída com sucesso!', 'success');
      setSelectedQuestionId(null);
      refetch();
    } catch (error) {
      reportError(error);
    }
  };

  const handleDeleteQuestion = (section, question) => requestConfirm({
    message: `Excluir a pergunta "${question.text}"? Esta ação não pode ser desfeita.`,
    confirmLabel: 'Excluir',
    onConfirm: () => deleteQuestion(section, question),
  });

  const handleQuestionUpdated = useCallback((signal) => {
    if (signal === 'conflict') onConflict();
    else refetch();
  }, [onConflict, refetch]);

  return {
    addingQuestion,
    justCreatedQuestionId,
    clearJustCreated: useCallback(() => setJustCreatedQuestionId(null), []),
    handleAddQuestion,
    handleDeleteQuestion,
    handleQuestionUpdated,
  };
};

export default useAnamnesisQuestions;
