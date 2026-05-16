const DEFAULT_VISIBLE_PROGRESSION_ROWS = 5;

/**
 * Groups exercise progression entries by training.
 * @param {object[]} entries
 * @returns {object[]} array of { trainingId, trainingName, rows }
 */
export const groupProgressionByTraining = (entries) => {
  if (!Array.isArray(entries)) return [];
  const map = new Map();
  entries.forEach((entry) => {
    const key = entry.trainingId ?? entry.trainingName ?? 'sem-treino';
    if (!map.has(key)) {
      map.set(key, {
        trainingId: entry.trainingId,
        trainingName: entry.trainingName ?? 'Outros',
        rows: [],
      });
    }
    map.get(key).rows.push(entry);
  });
  return Array.from(map.values());
};

/**
 * Slices groups so the total visible rows respects DEFAULT_VISIBLE_PROGRESSION_ROWS.
 * First group is always expanded; others expanded only if their id is in expandedIds.
 * @param {object[]} groups
 * @param {Set<string>} expandedIds
 * @returns {object[]}
 */
export const sliceVisibleGroups = (groups, expandedIds) => {
  let remaining = DEFAULT_VISIBLE_PROGRESSION_ROWS;
  return groups.map((group, index) => {
    const explicit = expandedIds.has(group.trainingId ?? group.trainingName);
    const expanded = explicit || index === 0;
    if (!expanded) {
      return { ...group, expanded: false, visibleRows: [], hiddenCount: group.rows.length };
    }
    if (explicit) {
      return { ...group, expanded, visibleRows: group.rows, hiddenCount: 0 };
    }
    if (remaining <= 0) {
      return { ...group, expanded, visibleRows: [], hiddenCount: group.rows.length };
    }
    const visibleRows = group.rows.slice(0, remaining);
    remaining -= visibleRows.length;
    return {
      ...group,
      expanded,
      visibleRows,
      hiddenCount: Math.max(0, group.rows.length - visibleRows.length),
    };
  });
};

/**
 * Expands all groups to show all rows.
 * @param {object[]} groups
 * @returns {object[]}
 */
export const expandAllGroups = (groups) =>
  groups.map((group) => ({
    ...group,
    expanded: true,
    visibleRows: group.rows,
    hiddenCount: 0,
  }));
