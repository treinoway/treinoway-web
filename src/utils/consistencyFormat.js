const MS_PER_MINUTE = 60 * 1000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MS_PER_DAY = MS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY;
const DAYS_PER_WEEK = 7;
const NEUTRAL_PLACEHOLDER = '—';

// Whole-percent label of a score; 100 only when the score is 100, a dash for a neutral week
export const formatScore = (score) => {
  if (score === null || score === undefined) return NEUTRAL_PLACEHOLDER;
  const rounded = Math.round(score);
  const capped = score < 100 && rounded >= 100 ? 99 : rounded;
  return `${capped}%`;
};

// Time left until the close as "4d 7h", "7h 20min" or "45min"; "0min" once passed
export const formatCountdown = (closesAt, now = new Date()) => {
  const totalMinutes = Math.max(0, Math.floor((new Date(closesAt).getTime() - new Date(now).getTime()) / MS_PER_MINUTE));
  const totalHours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const days = Math.floor(totalHours / HOURS_PER_DAY);
  if (days > 0) return `${days}d ${totalHours % HOURS_PER_DAY}h`;
  if (totalHours > 0) return `${totalHours}h ${totalMinutes % MINUTES_PER_HOUR}min`;
  return `${totalMinutes}min`;
};

// "Semana X de Y" header label
export const weekLabel = (current, total) => `Semana ${current} de ${total}`;

// Parts (weekday, day, month, hour, minute) of an instant in a time zone, in pt-BR
const closePartsOf = (closesAt, timeZone) => {
  const formatter = new Intl.DateTimeFormat('pt-BR', { timeZone, weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return Object.fromEntries(formatter.formatToParts(new Date(closesAt)).map((part) => [part.type, part.value]));
};

// "21h" or "21h30" of the close hour
const closeHourOf = (parts) => `${parts.hour}h${parts.minute === '00' ? '' : parts.minute}`;

// "domingo às 21h" of the close instant in the time zone
export const formatCloseLabel = (closesAt, timeZone) => {
  const parts = closePartsOf(closesAt, timeZone);
  return `${parts.weekday} às ${closeHourOf(parts)}`;
};

// "domingo, 08/11, às 21h" of the close instant in the time zone
export const formatCloseDateLabel = (closesAt, timeZone) => {
  const parts = closePartsOf(closesAt, timeZone);
  return `${parts.weekday}, ${parts.day}/${parts.month}, às ${closeHourOf(parts)}`;
};

// "YYYY-MM-DD" Monday of the running week of a season
export const currentWeekStartOf = (season) => {
  const start = Date.parse(season.startWeek) + (season.currentWeek - 1) * DAYS_PER_WEEK * MS_PER_DAY;
  return new Date(start).toISOString().slice(0, 10);
};
