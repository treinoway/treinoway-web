import {
  ALL_TEMPLATE_CATEGORIES,
  filterTemplatesByCategory,
  formatEstimatedTime,
  formatQuestionCount,
  getTemplateCategories,
  getTemplateCategoryLabel,
} from './anamnesisTemplates';

const template = (id, category = null, categoryLabel = null) => ({ id, category, categoryLabel });

describe('getTemplateCategoryLabel', () => {
  it('uses the label sent by the API', () => {
    expect(getTemplateCategoryLabel(template('a', 'hypertrophy', 'Hipertrofia (API)'))).toBe('Hipertrofia (API)');
  });

  it('falls back to the local label for a known category without label', () => {
    expect(getTemplateCategoryLabel(template('a', 'weight_loss'))).toBe('Emagrecimento');
  });

  it('returns null without category, or for an unknown category without label', () => {
    expect(getTemplateCategoryLabel(template('a'))).toBeNull();
    expect(getTemplateCategoryLabel({ id: 'old-api' })).toBeNull();
    expect(getTemplateCategoryLabel(template('a', 'mystery'))).toBeNull();
  });
});

describe('getTemplateCategories', () => {
  it('returns an empty list when no template has a category', () => {
    expect(getTemplateCategories([template('a'), { id: 'old-api' }])).toEqual([]);
    expect(getTemplateCategories(undefined)).toEqual([]);
  });

  it('lists each category once, in catalog order, unknown ones last', () => {
    const templates = [
      template('a', 'mystery', 'Outra'),
      template('b', 'hypertrophy', 'Hipertrofia'),
      template('c', 'screening', 'Triagem'),
      template('d', 'hypertrophy', 'Hipertrofia'),
      template('e'),
    ];
    expect(getTemplateCategories(templates)).toEqual([
      { value: 'screening', label: 'Triagem' },
      { value: 'hypertrophy', label: 'Hipertrofia' },
      { value: 'mystery', label: 'Outra' },
    ]);
  });
});

describe('filterTemplatesByCategory', () => {
  const templates = [template('a', 'screening', 'Triagem'), template('b'), template('c', 'hypertrophy', 'Hipertrofia')];

  it('keeps everything for "all"', () => {
    expect(filterTemplatesByCategory(templates, ALL_TEMPLATE_CATEGORIES)).toBe(templates);
  });

  it('keeps only the chosen category', () => {
    expect(filterTemplatesByCategory(templates, 'screening').map((t) => t.id)).toEqual(['a']);
  });
});

describe('formatQuestionCount', () => {
  it('formats singular, plural and zero', () => {
    expect(formatQuestionCount(1)).toBe('1 pergunta');
    expect(formatQuestionCount(12)).toBe('12 perguntas');
    expect(formatQuestionCount(0)).toBe('Nenhuma pergunta');
  });

  it('returns null when the count is missing', () => {
    expect(formatQuestionCount(undefined)).toBeNull();
    expect(formatQuestionCount(null)).toBeNull();
    expect(formatQuestionCount('12')).toBeNull();
  });
});

describe('formatEstimatedTime', () => {
  it('formats whole minutes', () => {
    expect(formatEstimatedTime(3)).toBe('Cerca de 3 min');
  });

  it('returns null when there is nothing to estimate', () => {
    expect(formatEstimatedTime(0)).toBeNull();
    expect(formatEstimatedTime(undefined)).toBeNull();
  });
});
