const MS_PER_MINUTE = 60 * 1000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
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
