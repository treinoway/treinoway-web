import buildExerciseRenderEntries from './exerciseRenderEntries';

// Finds the substitute log that replaced a swapped principal log, if any.
const findSubstituteLog = (exerciseLogs, log) => {
  if (log.status !== 'substituted' || !log.substitutedByExerciseId) return null;
  return exerciseLogs.find((other) => other !== log && other.exerciseId === log.substitutedByExerciseId) ?? null;
};

// Builds one display row per exercise slot, folding a swapped principal and its substitute log into one row.
const buildSessionRows = (exerciseLogs) => {
  const pairs = exerciseLogs.map((log) => [log, findSubstituteLog(exerciseLogs, log)]);
  const hiddenIds = new Set(pairs.filter(([, substitute]) => substitute).map(([, substitute]) => substitute.id));
  return pairs
    .filter(([log]) => !hiddenIds.has(log.id))
    .map(([log, substitute]) => ({
      log: substitute ?? log,
      replacedName: substitute ? log.exercise?.name ?? null : null,
      supersetGroupId: log.exercise?.supersetGroupId ?? null,
      supersetOrder: log.exercise?.supersetOrder ?? null,
    }));
};

/**
 * Turns a session's exercise logs into render entries (single rows and bi-set groups).
 *
 * @param {object[]} exerciseLogs
 * @returns {Array<{kind:'single',ex:object}|{kind:'group',groupId:string,members:object[]}>}
 */
const buildSessionExerciseEntries = (exerciseLogs) => buildExerciseRenderEntries(buildSessionRows(exerciseLogs));

export default buildSessionExerciseEntries;
