import { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { defaultSectionForm } from '../constants/anamnesis';
import api from '../api/axios';

/** Section create / edit / delete for the anamnesis editor. */
const useAnamnesisSections = ({
  anamnesisId,
  refetch,
  reportError,
  requestConfirm,
  selection,
}) => {
  const { showToast } = useToast();
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [sectionForm, setSectionForm] = useState(defaultSectionForm());
  const [savingSection, setSavingSection] = useState(false);

  const changeSectionTitle = (title) => setSectionForm((prev) => ({ ...prev, title }));

  const closeSectionForm = () => {
    setShowSectionForm(false);
    setSectionForm(defaultSectionForm());
  };

  const handleAddSection = async (event) => {
    event.preventDefault();
    setSavingSection(true);
    try {
      const response = await api.post(`/trainer/anamneses/${anamnesisId}/sections`, sectionForm);
      showToast('Seção adicionada com sucesso!', 'success');
      closeSectionForm();
      await refetch();
      selection.setSelectedSectionId(response.data.id ?? null);
      selection.setSelectedQuestionId(null);
    } catch (error) {
      reportError(error);
    } finally {
      setSavingSection(false);
    }
  };

  const deleteSection = async (section) => {
    try {
      await api.delete(`/trainer/anamneses/${anamnesisId}/sections/${section.id}`);
      showToast('Seção excluída com sucesso!', 'success');
      if (selection.selectedSectionId === section.id) {
        selection.setSelectedSectionId(null);
        selection.setSelectedQuestionId(null);
      }
      refetch();
    } catch (error) {
      reportError(error);
    }
  };

  const handleDeleteSection = (section) => requestConfirm({
    message: `Excluir a seção "${section.title}" e todas as suas perguntas? Esta ação não pode ser desfeita.`,
    confirmLabel: 'Excluir',
    onConfirm: () => deleteSection(section),
  });

  const handleEditSection = async (sectionId, data) => {
    try {
      await api.patch(`/trainer/anamneses/${anamnesisId}/sections/${sectionId}`, data);
      showToast('Seção atualizada com sucesso!', 'success');
      refetch();
      return true;
    } catch (error) {
      reportError(error);
      return false;
    }
  };

  return {
    showSectionForm,
    sectionForm,
    savingSection,
    openSectionForm: () => setShowSectionForm(true),
    closeSectionForm,
    changeSectionTitle,
    handleAddSection,
    handleDeleteSection,
    handleEditSection,
  };
};

export default useAnamnesisSections;
