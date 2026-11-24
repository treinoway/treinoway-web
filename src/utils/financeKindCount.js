import { t, tCount } from '../i18n';

/** "2 alunos · 1 paciente" from the split count; zero kinds are left out. */
export const buildKindCount = (byKind) => {
  const parts = [
    byKind.students > 0 && tCount('finance.countByKind.students', byKind.students),
    byKind.patients > 0 && tCount('finance.countByKind.patients', byKind.patients),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : t('finance.countByKind.none');
};
