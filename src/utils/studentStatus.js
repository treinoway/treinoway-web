/**
 * Billing status returned per student by GET /trainer/students. Computed by the
 * backend with the same rules as the dashboard: OVERDUE ⇔ counted in
 * plans.expiredCount, DUE_SOON ⇔ counted in plans.renewingSoonCount.
 */
export const BillingStatus = Object.freeze({
  OVERDUE: 'overdue',
  DUE_SOON: 'due_soon',
  OK: 'ok',
  NONE: 'none',
});

/**
 * UI status buckets for the student list. Values double as the
 * `?status=` URL param (ControlTower deep-links), so they must stay stable.
 */
export const StudentStatus = Object.freeze({
  ACTIVE: 'ativo',
  PENDING: 'pendente',
  OVERDUE: 'vencido',
});

export const STUDENT_STATUSES = Object.freeze([
  StudentStatus.ACTIVE,
  StudentStatus.PENDING,
  StudentStatus.OVERDUE,
]);

const BILLING_TO_STUDENT_STATUS = Object.freeze({
  [BillingStatus.OVERDUE]: StudentStatus.OVERDUE,
  [BillingStatus.DUE_SOON]: StudentStatus.PENDING,
  [BillingStatus.OK]: StudentStatus.ACTIVE,
  [BillingStatus.NONE]: StudentStatus.ACTIVE,
});

/** Maps a student's `billingStatus` to its UI status. Missing/unknown → 'ativo'. */
export const getStudentStatus = (student) =>
  BILLING_TO_STUDENT_STATUS[student?.billingStatus] ?? StudentStatus.ACTIVE;

/** Counts students per UI status: `{ ativo, pendente, vencido }`. */
export const countStudentsByStatus = (students) => {
  const counts = { [StudentStatus.ACTIVE]: 0, [StudentStatus.PENDING]: 0, [StudentStatus.OVERDUE]: 0 };
  students.forEach((student) => {
    counts[getStudentStatus(student)] += 1;
  });
  return counts;
};
