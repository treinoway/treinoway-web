import { t } from '../i18n';

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfWeekMonday = (date) => {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
};

export const groupConversationsByDate = (conversations) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = startOfWeekMonday(now);

  const sorted = [...conversations].sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt || 0);
    const dateB = new Date(b.updatedAt || b.createdAt || 0);
    return dateB - dateA;
  });

  const groups = { today: [], yesterday: [], week: [], older: [] };

  sorted.forEach((conv) => {
    const dateStr = conv.updatedAt || conv.createdAt;
    const date = dateStr ? new Date(dateStr) : null;

    if (!date || isNaN(date)) {
      groups.older.push(conv);
      return;
    }

    const convDay = startOfDay(date);

    if (convDay >= todayStart) {
      groups.today.push(conv);
    } else if (convDay >= yesterdayStart) {
      groups.yesterday.push(conv);
    } else if (convDay >= weekStart) {
      groups.week.push(conv);
    } else {
      groups.older.push(conv);
    }
  });

  const result = [];
  if (groups.today.length > 0) result.push({ label: t('iArnold.history.groups.today'), conversations: groups.today });
  if (groups.yesterday.length > 0) result.push({ label: t('iArnold.history.groups.yesterday'), conversations: groups.yesterday });
  if (groups.week.length > 0) result.push({ label: t('iArnold.history.groups.week'), conversations: groups.week });
  if (groups.older.length > 0) result.push({ label: t('iArnold.history.groups.older'), conversations: groups.older });

  return result;
};
