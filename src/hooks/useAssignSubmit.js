import { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

const pluralize = (count, singular, plural) => (count === 1 ? singular : plural);

/**
 * Links the anamnesis to every selected student. Full success calls `onDone`; a partial or total
 * failure keeps the user on the screen with a toast.
 */
const useAssignSubmit = ({ anamnesisId, selected, onDone }) => {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const reportResults = (total, succeeded) => {
    const failed = total - succeeded;
    if (failed === 0) {
      showToast(succeeded === 1 ? 'Anamnese enviada para 1 aluno' : `Anamnese enviada para ${succeeded} alunos`, 'success');
      onDone();
      return;
    }
    if (succeeded > 0) {
      showToast(`${succeeded} de ${total} envios concluídos — ${failed} ${pluralize(failed, 'falhou', 'falharam')}`, 'warning');
    } else {
      showToast('Nenhuma anamnese foi enviada. Tente novamente.', 'error');
    }
    setSubmitting(false);
  };

  const handleSubmit = async () => {
    if (selected.size === 0 || submitting) return;
    setSubmitting(true);
    const ids = [...selected];
    const results = await Promise.allSettled(
      ids.map((id) => api.post(`/trainer/students/${id}/anamneses`, { anamnesisId })),
    );
    reportResults(ids.length, results.filter((r) => r.status === 'fulfilled').length);
  };

  return { submitting, handleSubmit };
};

export default useAssignSubmit;
