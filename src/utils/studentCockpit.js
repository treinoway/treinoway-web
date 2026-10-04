import { tf } from '../i18n';
import { todayDateString } from './subscriptionHelpers';
import { formatDateForDisplay } from './dateFormat';

/** Copy of the trainer's student detail page (`studentDetail.*` in the locale files). */
export const td = (key, params) => tf(`studentDetail.${key}`, params);

const DAY_MS = 1000 * 60 * 60 * 24;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})/;

const MONTH_NAMES_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const toUtcDay = (dateOnly) => {
  const match = DATE_ONLY.exec(dateOnly ?? '');
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

const pluralizeDays = (days) => (days === 1 ? td('metrics.dayOne') : td('metrics.dayOther', { count: days }));

/** Whole days from `today` until a "YYYY-MM-DD" date (negative when past); null when invalid. */
export const daysUntil = (dateOnly, today = todayDateString()) => {
  const target = toUtcDay(dateOnly);
  const base = toUtcDay(today);
  if (target === null || base === null) return null;
  return Math.round((target - base) / DAY_MS);
};

/** Lowercased pt-BR month name for a "YYYY-MM-01" string; null when invalid. */
export const formatMonthName = (monthStartIso) => {
  const match = DATE_ONLY.exec(monthStartIso ?? '');
  if (!match) return null;
  return MONTH_NAMES_PT[Number(match[2]) - 1] ?? null;
};

/** "↓ 47 pts vs junho" / "↑ 3 pts vs junho" / "Sem mudança vs junho"; null without both values. */
export const formatAdherenceDelta = (current, previous, previousMonthIso) => {
  if (current == null || previous == null) return null;
  const monthName = formatMonthName(previousMonthIso);
  if (!monthName) return null;
  const diff = Math.round(current - previous);
  if (diff === 0) return td('metrics.deltaSame', { month: monthName });
  const key = diff > 0 ? 'metrics.deltaUp' : 'metrics.deltaDown';
  return td(key, { points: Math.abs(diff), month: monthName });
};

/** "vence em 9 dias" / "vence hoje" / "venceu há 3 dias"; null without an expiration date. */
export const formatExpiryHint = (expirationDate, today) => {
  const days = daysUntil(expirationDate, today);
  if (days === null) return null;
  if (days === 0) return td('routines.expiresToday');
  if (days > 0) return td('routines.expiresIn', { days: pluralizeDays(days) });
  return td('routines.expiredAgo', { days: pluralizeDays(Math.abs(days)) });
};

/**
 * Renewal metric for the subscription's current payment cycle. The cycle end
 * (or due date) is when the next charge happens; past it, the cycle is overdue.
 */
export const getRenewalInfo = (payment, today) => {
  const reference = payment?.cycleEndDate || payment?.dueDate;
  const days = daysUntil(reference, today);
  if (days === null) return null;
  const date = formatDateForDisplay(reference);
  if (days < 0) return { label: td('metrics.overdueSince'), value: pluralizeDays(Math.abs(days)), date, overdue: true };
  if (days === 0) return { label: td('metrics.renews'), value: td('metrics.today'), date, overdue: false };
  return { label: td('metrics.renewsIn'), value: pluralizeDays(days), date, overdue: false };
};

/** Active routines first, then the most recent start date. */
export const sortProtocolsForDisplay = (protocols) =>
  [...protocols].sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (b.status === 'active' && a.status !== 'active') return 1;
    return new Date(b.startDate) - new Date(a.startDate);
  });

/** The first session (list is newest first) that carries a student note. */
export const findLatestNoteSession = (sessions) =>
  (Array.isArray(sessions) ? sessions : []).find((session) => Boolean(session?.noteText)) ?? null;
