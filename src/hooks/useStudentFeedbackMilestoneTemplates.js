import { useCallback, useState } from 'react';
import { getStudentFeedbackMilestoneTemplates, listStudentFeedbackTemplates, updateStudentFeedbackMilestoneTemplates } from '../api/studentFeedback';
import { generalTemplateIdOf, orderTemplateOptions } from '../utils/studentFeedbackTemplate';
import useLoadResource from './useLoadResource';

// The templates and the template saved for each milestone, loaded together because the picker needs both
const loadMilestoneTemplates = async () => {
  const [templates, saved] = await Promise.all([listStudentFeedbackTemplates(), getStudentFeedbackMilestoneTemplates()]);
  return { templates: orderTemplateOptions(templates), saved };
};

// Picks whose template differs from the saved one, as the service stores them (null for the general template)
const changedPicks = (picks, saved) => Object.fromEntries(Object.entries(picks).filter(([field, templateId]) => templateId !== (saved[field] ?? null)));

// Template per milestone: options, saved picks with local changes on top, unsaved-change flag and save of only the changed milestones; `available` stays false while loading and when the load fails
const useStudentFeedbackMilestoneTemplates = () => {
  const { data, setData } = useLoadResource(loadMilestoneTemplates, 'milestone-templates');
  const [picks, setPicks] = useState({});
  const [saving, setSaving] = useState(false);

  const templates = data?.templates ?? [];
  const generalId = generalTemplateIdOf(templates);
  const changes = data ? changedPicks(picks, data.saved) : {};
  const isDirty = Object.keys(changes).length > 0;

  const valueOf = (field) => {
    const templateId = field in picks ? picks[field] : data?.saved[field];
    const isKnown = templates.some((template) => template.id === templateId);
    return (isKnown ? templateId : generalId) ?? '';
  };

  const pick = useCallback((field, templateId) => {
    setPicks((current) => ({ ...current, [field]: templateId === generalId ? null : templateId }));
  }, [generalId]);

  const save = async () => {
    setSaving(true);
    try {
      const saved = await updateStudentFeedbackMilestoneTemplates(changes);
      setData((current) => ({ ...current, saved }));
      setPicks({});
    } finally {
      setSaving(false);
    }
  };

  return { available: Boolean(data), templates, valueOf, pick, isDirty, saving, save };
};

export default useStudentFeedbackMilestoneTemplates;
