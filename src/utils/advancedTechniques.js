import { getGifUrlError } from './gif';
import { getYoutubeVideoId } from './youtube';

export const MAX_ADVANCED_TECHNIQUES = 5;

// Techniques sorted by their server `order` (stable when `order` is missing).
export const sortTechniquesByOrder = (techniques) =>
  [...(techniques ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

// Ids in list order, as sent in `advancedTechniqueIds`.
export const getTechniqueIds = (techniques) => (techniques ?? []).map((technique) => technique.id);

// Techniques the trainer has not soft-deleted from the library (deleted refs are dropped on save).
export const withoutDeletedTechniques = (techniques) => (techniques ?? []).filter((technique) => !technique.isDeleted);

// Ids to send as `advancedTechniqueIds`: list order, deleted techniques skipped (the API rejects them).
export const toTechniqueIds = (techniques) => getTechniqueIds(withoutDeletedTechniques(techniques));

// True when both lists hold the same technique ids in the same order.
export const haveSameTechniqueIds = (a, b) => {
  const idsA = getTechniqueIds(a);
  const idsB = getTechniqueIds(b);
  return idsA.length === idsB.length && idsA.every((id, index) => id === idsB[index]);
};

// Display refs ({ id, key, name, description, videoUrl, gifUrl, isDeleted, order }) re-indexed to the list order.
export const toTechniqueRefs = (techniques) =>
  (techniques ?? []).map((technique, order) => ({
    id: technique.id,
    key: technique.key ?? null,
    name: technique.name,
    description: technique.description,
    videoUrl: technique.videoUrl ?? null,
    gifUrl: technique.gifUrl ?? null,
    isDeleted: technique.isDeleted ?? false,
    order,
  }));

// `advancedTechniqueIds` of an exercise-like object minus the ids its display list flags as deleted (the API rejects them).
export const getLiveTechniqueIds = (exercise) => {
  const deleted = new Set(getTechniqueIds((exercise.advancedTechniques ?? []).filter((technique) => technique.isDeleted)));
  return exercise.advancedTechniqueIds.filter((id) => !deleted.has(id));
};

// Body for the API: the display-only `advancedTechniques` list is never sent, nor are deleted ids.
export const stripTechniqueDisplay = (payload) => {
  const { advancedTechniques: _display, ...body } = payload ?? {};
  if (Array.isArray(body.advancedTechniqueIds)) body.advancedTechniqueIds = getLiveTechniqueIds(payload);
  return body;
};

export const TECHNIQUE_NAME_MAX = 80;
export const TECHNIQUE_DESCRIPTION_MAX = 600;
export const EMPTY_TECHNIQUE_FORM = { name: '', description: '', videoUrl: '', gifUrl: '' };

// Field errors of a technique form (same rules as the API); empty object when valid.
export const validateTechniqueForm = (form) => {
  const name = form.name.trim();
  const description = form.description.trim();
  const errors = {};
  if (!name) errors.name = 'Informe o nome da técnica.';
  else if (name.length > TECHNIQUE_NAME_MAX) errors.name = `Use no máximo ${TECHNIQUE_NAME_MAX} caracteres.`;
  if (!description) errors.description = 'Informe a descrição da técnica.';
  else if (description.length > TECHNIQUE_DESCRIPTION_MAX) errors.description = `Use no máximo ${TECHNIQUE_DESCRIPTION_MAX} caracteres.`;
  if (form.videoUrl.trim() && !getYoutubeVideoId(form.videoUrl)) errors.videoUrl = 'Link de YouTube inválido';
  const gifError = getGifUrlError(form.gifUrl);
  if (gifError) errors.gifUrl = gifError;
  return errors;
};

// Create/update body: empty media is omitted on create and sent as null on edit (clears it).
export const buildTechniquePayload = (form, { isEdit = false } = {}) => {
  const payload = { name: form.name.trim(), description: form.description.trim() };
  ['videoUrl', 'gifUrl'].forEach((field) => {
    const value = form[field].trim();
    if (value) payload[field] = value;
    else if (isEdit) payload[field] = null;
  });
  return payload;
};

// Editable form values of a technique returned by the API.
export const techniqueToForm = (technique) => ({
  name: technique.name ?? '',
  description: technique.description ?? '',
  videoUrl: technique.videoUrl ?? '',
  gifUrl: technique.gifUrl ?? '',
});
