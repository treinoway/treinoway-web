import { dayMonthOf, weekLabel } from './consistencyFormat';
import { CHALLENGE_FORMAT, CHALLENGE_MAX_WEEKS, CHALLENGE_MIN_WEEKS, CHALLENGE_START_MONDAY_COUNT, CHALLENGE_STATUS } from '../constants/challenge';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;
const WEEKDAY_INDEX = Object.freeze({ Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 });

// Civil date ("YYYY-MM-DD") and days since Monday of an instant in a time zone
const civilPartsOf = (now, timeZone) => {
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(now)).map((part) => [part.type, part.value]));
  return { dateKey: `${parts.year}-${parts.month}-${parts.day}`, daysSinceMonday: WEEKDAY_INDEX[parts.weekday] };
};

// "YYYY-MM-DD" of a date key shifted by some days
const shiftDateKey = (dateKey, days) => new Date(Date.parse(dateKey) + days * MS_PER_DAY).toISOString().slice(0, 10);

// "YYYY-MM-DD" Monday of the week that holds the instant, in the time zone
export const currentMondayOf = (now, timeZone) => {
  const { dateKey, daysSinceMonday } = civilPartsOf(now, timeZone);
  return shiftDateKey(dateKey, -daysSinceMonday);
};

// Start Mondays offered by the form: the current week's Monday and the next ones, as { value, label }
export const startMondayOptions = (now, timeZone, count = CHALLENGE_START_MONDAY_COUNT) => {
  const firstMonday = currentMondayOf(now, timeZone);
  return Array.from({ length: count }, (_, index) => {
    const value = shiftDateKey(firstMonday, index * DAYS_PER_WEEK);
    return { value, label: `Segunda, ${dayMonthOf(value)}` };
  });
};

// Number-of-weeks choices, 1 to 12
export const WEEK_COUNT_OPTIONS = Object.freeze(
  Array.from({ length: CHALLENGE_MAX_WEEKS - CHALLENGE_MIN_WEEKS + 1 }, (_, index) => CHALLENGE_MIN_WEEKS + index),
);

// "Começa DD/MM" of a scheduled championship
export const startsOnLabel = (startDate) => `Começa ${dayMonthOf(startDate)}`;

// Week label of a weekly championship: "Semana X de Y" while active, "Começa DD/MM" while scheduled, null otherwise
export const challengeWeekLabel = (challenge) => {
  if (challenge?.format !== CHALLENGE_FORMAT.WEEKS) return null;
  if (challenge.status === CHALLENGE_STATUS.ACTIVE && challenge.currentWeek) return weekLabel(challenge.currentWeek, challenge.weeks);
  if (challenge.status === CHALLENGE_STATUS.SCHEDULED && challenge.startDate) return startsOnLabel(challenge.startDate);
  return null;
};

// "DD/MM" and "HH" of an instant in a time zone
const closePartsOf = (closesAt, timeZone) => {
  const formatter = new Intl.DateTimeFormat('pt-BR', { timeZone, day: '2-digit', month: '2-digit', hour: '2-digit', hourCycle: 'h23' });
  return Object.fromEntries(formatter.formatToParts(new Date(closesAt)).map((part) => [part.type, part.value]));
};

// "Encerra no fechamento de DD/MM, às HHh." of the close instant; without it, the last Sunday only
export const closeNoticeOf = (closesAt, timeZone, endDate) => {
  if (!closesAt) return `Encerra no fechamento de ${dayMonthOf(endDate)}.`;
  const parts = closePartsOf(closesAt, timeZone);
  return `Encerra no fechamento de ${parts.day}/${parts.month}, às ${parts.hour}h.`;
};
