const JUNCTION_OVERRIDE_FIELDS = [
  'name',
  'type',
  'videoUrl',
  'sets',
  'repetitions',
  'duration',
  'prescriptionMode',
  'intensity',
  'hasLoad',
  'suggestedLoad',
  'restInterval',
  'notes',
];

export const EMPTY_TRAINING_TEMPLATE_FORM = {
  name: '',
  description: '',
  category: '',
  bodySegment: '',
  isPublic: false,
  exerciseTemplateIds: [],
};

const isSameId = (a, b) => String(a) === String(b);

export const normalizeExerciseTemplateIds = (ids) =>
  (ids || []).map((id) => (typeof id === 'number' || Number.isNaN(Number(id)) ? id : Number(id)));

/** Extract exercise template ids from an API template (ids list or junction lists). */
export const getExerciseTemplateIds = (template) => {
  if (Array.isArray(template.exerciseTemplateIds)) return template.exerciseTemplateIds;
  const junctions = template.trainingTemplateExerciseTemplates;
  if (Array.isArray(junctions)) {
    return junctions.map((j) => j.exerciseTemplateId ?? j.exerciseTemplate?.id).filter((id) => id != null);
  }
  if (!Array.isArray(template.exerciseTemplates)) return [];
  return template.exerciseTemplates
    .map((e) => e.exerciseTemplateId ?? e.id ?? e.exerciseTemplate?.id)
    .filter((id) => id != null);
};

export const getExerciseJunctions = (template) =>
  Array.isArray(template?.trainingTemplateExerciseTemplates) ? template.trainingTemplateExerciseTemplates : [];

export const buildFormFromTemplate = (template) => ({
  name: template.name,
  description: template.description || '',
  category: template.category || '',
  bodySegment: template.bodySegment || '',
  isPublic: template.isPublic || false,
  exerciseTemplateIds: getExerciseTemplateIds(template),
});

export const findJunction = (junctions, exerciseTemplateId) =>
  junctions.find((j) => isSameId(j.exerciseTemplateId, exerciseTemplateId));

/** A draft junction has no `id`: it is persisted by the main form's POST/PATCH. */
export const buildDraftJunction = (exerciseTemplate) => ({
  exerciseTemplateId: exerciseTemplate.id,
  name: exerciseTemplate.name ?? null,
  type: exerciseTemplate.type ?? null,
  videoUrl: exerciseTemplate.videoUrl ?? null,
  sets: exerciseTemplate.sets ?? null,
  repetitions: exerciseTemplate.repetitions ?? null,
  duration: exerciseTemplate.duration ?? null,
  prescriptionMode: exerciseTemplate.prescriptionMode ?? 'reps',
  intensity: exerciseTemplate.intensity ?? null,
  hasLoad: exerciseTemplate.hasLoad ?? false,
  suggestedLoad: exerciseTemplate.suggestedLoad ?? null,
  restInterval: exerciseTemplate.restInterval ?? null,
  notes: exerciseTemplate.notes ?? null,
  exerciseTemplate: { id: exerciseTemplate.id, name: exerciseTemplate.name, type: exerciseTemplate.type },
});

export const applyPayloadToDraft = (junction, payload) => {
  const overrides = Object.fromEntries(
    JUNCTION_OVERRIDE_FIELDS.filter((field) => payload[field] !== undefined).map((field) => [field, payload[field]]),
  );
  return { ...junction, ...overrides };
};

const buildExercisePayload = (id, order, junctions) => {
  const junction = findJunction(junctions, id);
  if (!junction) return { exerciseTemplateId: id, order };
  const overrides = Object.fromEntries(JUNCTION_OVERRIDE_FIELDS.map((field) => [field, junction[field]]));
  return { exerciseTemplateId: id, order, ...overrides };
};

/** `isPublic` is only sent when `includeVisibility` (admins); otherwise the backend keeps/defaults it. */
export const buildTrainingTemplatePayload = (formData, junctions, { includeVisibility = false } = {}) => {
  const { exerciseTemplateIds, isPublic, ...rest } = formData;
  const ids = normalizeExerciseTemplateIds(exerciseTemplateIds);
  return {
    ...rest,
    ...(includeVisibility && { isPublic }),
    exerciseTemplates: ids.map((id, index) => buildExercisePayload(id, index, junctions)),
  };
};
