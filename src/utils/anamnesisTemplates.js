import { ANAMNESIS_TEMPLATE_CATEGORIES } from '../constants/anamnesis';

export const ALL_TEMPLATE_CATEGORIES = 'all';

const FALLBACK_CATEGORY_LABEL = Object.fromEntries(
  ANAMNESIS_TEMPLATE_CATEGORIES.map((category) => [category.value, category.label]),
);

const KNOWN_CATEGORY_ORDER = ANAMNESIS_TEMPLATE_CATEGORIES.map((category) => category.value);

/** Label of a template's category, or null when it has none we can name. */
export const getTemplateCategoryLabel = (template) => {
  if (!template?.category) return null;
  return template.categoryLabel || FALLBACK_CATEGORY_LABEL[template.category] || null;
};

const categoryRank = (value) => {
  const index = KNOWN_CATEGORY_ORDER.indexOf(value);
  return index === -1 ? KNOWN_CATEGORY_ORDER.length : index;
};

/**
 * Categories present in the templates (`[{ value, label }]`), known ones in the
 * catalog order and unknown ones after them. Empty when no template is categorized.
 */
export const getTemplateCategories = (templates) => {
  const found = new Map();
  for (const template of templates ?? []) {
    const label = getTemplateCategoryLabel(template);
    if (label && !found.has(template.category)) found.set(template.category, label);
  }
  return [...found.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => categoryRank(a.value) - categoryRank(b.value));
};

export const filterTemplatesByCategory = (templates, category) => {
  if (category === ALL_TEMPLATE_CATEGORIES) return templates;
  return templates.filter((template) => template.category === category);
};

/** "1 pergunta" / "12 perguntas"; null when the count is unknown (older API). */
export const formatQuestionCount = (count) => {
  if (!Number.isFinite(count)) return null;
  if (count === 0) return 'Nenhuma pergunta';
  return count === 1 ? '1 pergunta' : `${count} perguntas`;
};

/** "Cerca de 3 min"; null when there is nothing to estimate. */
export const formatEstimatedTime = (minutes) => {
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  return `Cerca de ${minutes} min`;
};
