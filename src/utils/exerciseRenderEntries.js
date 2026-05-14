/**
 * Groups a flat exercises array into render entries.
 *
 * Each entry is one of:
 *   { kind: 'single', ex }
 *   { kind: 'group',  groupId, members: ex[] }
 *
 * Bi-set members are guaranteed contiguous by the backend's contiguity
 * invariant, so a simple forward scan is sufficient. Members are sorted
 * by supersetOrder within each group.
 *
 * @param {object[]} exercises  Flat array from training.exercises
 * @returns {Array<{kind:'single',ex:object}|{kind:'group',groupId:string,members:object[]}>}
 */
const buildExerciseRenderEntries = (exercises) => {
  const entries = [];
  let i = 0;
  while (i < exercises.length) {
    const ex = exercises[i];
    const groupId = ex.supersetGroupId;
    if (!groupId) {
      entries.push({ kind: 'single', ex });
      i += 1;
      continue;
    }
    // Walk forward gathering all consecutive members of this group.
    const members = [ex];
    let j = i + 1;
    while (j < exercises.length && exercises[j].supersetGroupId === groupId) {
      members.push(exercises[j]);
      j += 1;
    }
    members.sort((a, b) => (a.supersetOrder ?? 0) - (b.supersetOrder ?? 0));
    entries.push({ kind: 'group', groupId, members });
    i = j;
  }
  return entries;
};

export default buildExerciseRenderEntries;
