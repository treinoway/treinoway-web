import { useCallback, useState } from 'react';
import { getStudentFeedbackConfig, updateStudentFeedbackConfig } from '../api/studentFeedback';
import useLoadResource from './useLoadResource';
import { FEEDBACK_RESPONSE_WINDOW_DAYS } from '../constants/studentFeedback';

// Fields of the draft whose value differs from the saved configuration
const changedFields = (draft, saved) => Object.fromEntries(Object.entries(draft).filter(([field, value]) => value !== saved[field]));

// Response window of a configuration; one answered before the field existed has the default window
const responseWindowOf = (config) => config?.responseWindowDays ?? FEEDBACK_RESPONSE_WINDOW_DAYS.default;

// Auto-send configuration: saved values, local changes on top, the response window in force, unsaved-change flag and save of only the changed fields
const useStudentFeedbackConfig = () => {
  const { data: saved, loading, error, setData: setSaved, reload } = useLoadResource(getStudentFeedbackConfig, 'config');
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(false);

  const config = saved ? { ...saved, ...edits } : null;
  // why: picking the default window again is not a change when the saved configuration predates the field
  const changes = saved ? changedFields(edits, { ...saved, responseWindowDays: responseWindowOf(saved) }) : {};
  const isDirty = Object.keys(changes).length > 0;

  const setField = useCallback((field, value) => setEdits((current) => ({ ...current, [field]: value })), []);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateStudentFeedbackConfig(changes);
      setSaved(updated);
      setEdits({});
    } finally {
      setSaving(false);
    }
  };

  return { config, responseWindowDays: responseWindowOf(config), loading, error, saving, isDirty, canSave: isDirty && !saving, setField, save, reload };
};

export default useStudentFeedbackConfig;
