import { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';

const HTTP_BAD_REQUEST = 400;
const HTTP_CONFLICT = 409;

/**
 * Submits the wizard payload. Server-side validation details are mapped onto
 * the wizard fields; any other failure becomes a toast (`onConflict` also runs
 * on 409 so the caller can reload the state that caused it). With a `draft`
 * (autosave), pending draft saves are flushed first and autosave stays paused
 * until the submit fails, so no draft PATCH can land after the POST.
 */
const useAnamnesisSubmit = ({ wizard, submit, onSubmitted, onConflict, draft }) => {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // A draft conflict was already reported by the draft hook; there is nothing to submit.
      if (draft && !(await draft.prepareForSubmit())) return;
      await submit(wizard.buildPayload());
      onSubmitted();
    } catch (error) {
      draft?.resume();
      const status = error.response?.status;
      if (status === HTTP_BAD_REQUEST && wizard.applyServerErrors(error.response?.data?.details)) return;
      showToast(error.userMessage || translateError(error), 'error');
      if (status === HTTP_CONFLICT) onConflict?.(error);
    } finally {
      setSubmitting(false);
    }
  };

  return { submitting, handleSubmit };
};

export default useAnamnesisSubmit;
