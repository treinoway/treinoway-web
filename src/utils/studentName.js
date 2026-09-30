const FALLBACK_NAME = 'Aluno';

export const getStudentFullName = (student) => {
  const name = [student?.firstName, student?.lastName].filter(Boolean).join(' ');
  return name || student?.email || FALLBACK_NAME;
};

export const getStudentFirstName = (student) => student?.firstName || getStudentFullName(student);

export const getStudentInitials = (student) => {
  const initials = `${student?.firstName?.[0] ?? ''}${student?.lastName?.[0] ?? ''}`;
  return (initials || student?.email?.[0] || '?').toUpperCase();
};
