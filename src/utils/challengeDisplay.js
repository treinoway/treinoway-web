import { CHALLENGE_STATUS } from '../constants/challenge';
import { normalizeForSearch } from './subscriptionHelpers';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// "YYYY-MM-DD" of the day before a date key
const dayBefore = (dateKey) => new Date(Date.parse(dateKey) - MS_PER_DAY).toISOString().slice(0, 10);

// Tag of a running championship: "Último dia" on its end date, "Em andamento" otherwise
const activeTagOf = (challenge, today) => (
  challenge.endDate === today
    ? { label: 'Último dia', tone: 'warning' }
    : { label: 'Em andamento', tone: 'brand' }
);

// Tag of a scheduled championship: "Começa amanhã" the day before its start, "Agendado" otherwise
const scheduledTagOf = (challenge, today) => (
  challenge.startDate && dayBefore(challenge.startDate) === today
    ? { label: 'Começa amanhã', tone: 'neutral' }
    : { label: 'Agendado', tone: 'neutral' }
);

/**
 * Status tag { label, tone } of a championship on a civil day ("YYYY-MM-DD"); the detail calls a closed one "Concluído".
 * @param {object} challenge - championship with status, startDate and endDate ("YYYY-MM-DD")
 * @param {string} today - civil date key of the trainer
 * @param {{ detail?: boolean }} [options]
 * @returns {{ label: string, tone: string }}
 */
export const challengeTagOf = (challenge, today, { detail = false } = {}) => {
  if (challenge.status === CHALLENGE_STATUS.CANCELLED) return { label: 'Cancelado', tone: 'error' };
  if (challenge.status === CHALLENGE_STATUS.COMPLETED) return { label: detail ? 'Concluído' : 'Encerrado', tone: 'success' };
  if (challenge.status === CHALLENGE_STATUS.ACTIVE) return activeTagOf(challenge, today);
  return scheduledTagOf(challenge, today);
};

// Every name a standings or ranking row carries: the full name, the short display name and first plus last name
const rowNamesOf = (row) => [row.name, row.displayName, [row.firstName, row.lastName].filter(Boolean).join(' ')].filter(Boolean);

// Rows whose full or short name contains the query, ignoring case and accents; an empty query keeps every row
export const filterParticipantsByName = (rows, query) => {
  const needle = normalizeForSearch(query);
  if (!needle) return rows;
  return rows.filter((row) => rowNamesOf(row).some((name) => normalizeForSearch(name).includes(needle)));
};

// Sum of a numeric field over the entries
const sumOf = (entries, field) => entries.reduce((total, entry) => total + (entry[field] || 0), 0);

// Number of entries with a positive value in a field
const countPositive = (entries, field) => entries.filter((entry) => (entry[field] || 0) > 0).length;

/**
 * Numbers of the XP cards, summed over the ranking entries (ordered by position).
 * @param {Array<object>} entries - ranking entries with points, workouts, bonusPoints and pointsThisWeek
 * @returns {{ participants: number, scoredThisWeek: number, leaderPoints: number|null, leaderLead: number|null, workouts: number, bonusPoints: number, bonusStudents: number }}
 */
export const pointsKpisOf = (entries) => {
  const [leader, runnerUp] = entries;
  return {
    participants: entries.length,
    scoredThisWeek: countPositive(entries, 'pointsThisWeek'),
    leaderPoints: leader ? leader.points : null,
    leaderLead: leader && runnerUp ? leader.points - runnerUp.points : null,
    workouts: sumOf(entries, 'workouts'),
    bonusPoints: sumOf(entries, 'bonusPoints'),
    bonusStudents: countPositive(entries, 'bonusPoints'),
  };
};
