import { sortTechniquesByOrder, stripTechniqueDisplay } from './advancedTechniques';

const TEMPLATE_DEFAULT_FIELDS = [
  'prescriptionMode', 'sets', 'repetitions', 'duration', 'restInterval', 'hasLoad', 'suggestedLoad', 'notes', 'videoUrl', 'gifUrl',
];

// Picks the prescription fields a library template defines.
const templateDefaults = (template) =>
  TEMPLATE_DEFAULT_FIELDS.reduce((defaults, key) => {
    if (template[key] != null && template[key] !== '') defaults[key] = template[key];
    return defaults;
  }, {});

/**
 * Builds the single substitute body for a library pick: template link and identity plus the edited prescription.
 * @param {object} template - the picked library template
 * @param {object} overrides - composer overrides (may carry the `template` object, dropped here)
 * @param {{ local: boolean }} options - local bodies also carry template defaults so the draft row is complete
 * @returns {object} the body for the API or the local draft
 */
export const buildSubstituteFromTemplate = (template, overrides, { local }) => {
  const { template: _template, ...edited } = overrides ?? {};
  return {
    ...(local ? { ...templateDefaults(template), advancedTechniques: sortTechniquesByOrder(template.advancedTechniques) } : {}),
    exerciseTemplateId: template.id,
    name: template.name,
    type: template.type,
    ...edited,
  };
};

// Body sent to the API: the display-only technique list is dropped.
export const toSubstituteApiBody = stripTechniqueDisplay;
