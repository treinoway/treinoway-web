import { useCallback, useState } from 'react';
import { getStudentFeedbackConfig, updateStudentFeedbackConfig } from '../api/studentFeedback';
import useLoadResource from './useLoadResource';

// Fields of the draft whose value differs from the saved configuration
const changedFields = (draft, saved) => Object.fromEntries(Object.entries(draft).filter(([field, value]) => value !== saved[field]));

// Auto-send configuration: saved values, local changes on top, unsaved-change flag and save of only the changed fields
const useStudentFeedbackConfig = () => {
  const { data: saved, loading, error, setData: setSaved, reload } = useLoadResource(getStudentFeedbackConfig, 'config');
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(false);

  const config = saved ? { ...saved, ...edits } : null;
  const changes = saved ? changedFields(edits, saved) : {};
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

  return { config, loading, error, saving, isDirty, canSave: isDirty && !saving, setField, save, reload };
};

export default useStudentFeedbackConfig;
