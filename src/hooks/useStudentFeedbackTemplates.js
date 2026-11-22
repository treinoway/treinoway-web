import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { createStudentFeedbackTemplate, deleteStudentFeedbackTemplate, duplicateStudentFeedbackTemplate, listStudentFeedbackTemplates } from '../api/studentFeedback';
import { studentFeedbackTemplatePath } from '../constants/studentFeedback';
import { orderTemplateOptions } from '../utils/studentFeedbackTemplate';
import { translateError } from '../i18n';
import useLoadResource from './useLoadResource';

// Templates of the trainer for a picker, general first; empty while loading and when the load fails, so the caller keeps working with the default
export const useStudentFeedbackTemplateOptions = () => {
  const { data } = useLoadResource(listStudentFeedbackTemplates, 'templates');
  return data ? orderTemplateOptions(data) : [];
};

// Copies a template and opens the copy in the builder; a failure is shown as a toast and the trainer stays where they are
export const useDuplicateStudentFeedbackTemplate = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [duplicating, setDuplicating] = useState(false);

  const duplicate = useCallback(async (templateId) => {
    setDuplicating(true);
    try {
      const copy = await duplicateStudentFeedbackTemplate(templateId);
      navigate(studentFeedbackTemplatePath(copy.id));
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setDuplicating(false);
    }
  }, [navigate, showToast]);

  return { duplicate, duplicating };
};

// Creates a template and opens it in the builder; a failure is shown as a toast and the trainer stays where they are
export const useCreateStudentFeedbackTemplate = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);

  const create = useCallback(async (input) => {
    setCreating(true);
    try {
      const created = await createStudentFeedbackTemplate(input);
      navigate(studentFeedbackTemplatePath(created.id));
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setCreating(false);
    }
  }, [navigate, showToast]);

  return { create, creating };
};

// Template list of the trainer: the general one first, load state, retry and removal of an own template
const useStudentFeedbackTemplates = () => {
  const { data, loading, error, setData, reload } = useLoadResource(listStudentFeedbackTemplates, 'templates');

  const remove = async (templateId) => {
    await deleteStudentFeedbackTemplate(templateId);
    setData((current) => current.filter((template) => template.id !== templateId));
    // why: the milestones that used the deleted template now count for the general one, which only the service knows
    await reload({ silent: true });
  };

  return { templates: data ? orderTemplateOptions(data) : [], loading, error, reload, remove };
};

export default useStudentFeedbackTemplates;
