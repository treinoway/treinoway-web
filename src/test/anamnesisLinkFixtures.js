const AT = '2026-09-29T15:00:00.000Z';

export const linkResponses = {
  draft: {
    status: 'draft',
    statusLabel: 'Rascunho',
    filledBy: 'student',
    filledByLabel: 'Aluno',
    submittedAt: null,
    answeredCount: 4,
    updatedAt: AT,
  },
  awaitingByTrainer: {
    status: 'awaiting_confirmation',
    statusLabel: 'Aguardando confirmação',
    filledBy: 'trainer',
    filledByLabel: 'Professor',
    submittedAt: AT,
    answeredCount: 10,
    updatedAt: AT,
  },
  submitted: {
    status: 'submitted',
    statusLabel: 'Respondida',
    filledBy: 'student',
    filledByLabel: 'Aluno',
    submittedAt: AT,
    answeredCount: 10,
    updatedAt: AT,
  },
};

/** Link item as returned by GET /trainer/students/:id/anamneses; omitted keys stay absent (old backend). */
export const buildAnamnesisLink = ({ id, title, ...extra }) => ({
  id: `link-${id}`,
  createdAt: '2026-01-15',
  anamnesis: { id, title, isGeneral: false },
  ...extra,
});
