import { ANAMNESIS_QUESTION_TYPE } from './anamnesis';

export const DEFAULT_QUESTION_TEXT = 'Digite a pergunta…';

export const QUESTION_PRESETS = [
  { text: 'Histórico familiar de diabetes', type: ANAMNESIS_QUESTION_TYPE.DICHOTOMOUS },
  { text: 'Uso de medicamentos', type: ANAMNESIS_QUESTION_TYPE.FREE_TEXT },
  { text: 'Alergias alimentares', type: ANAMNESIS_QUESTION_TYPE.FREE_TEXT },
];

export const EDITOR_TABS = {
  OUTLINE: 'outline',
  CANVAS: 'canvas',
  LIBRARY: 'tipos',
};

export const buildQuestionPayload = (type, text = DEFAULT_QUESTION_TEXT) => ({
  text,
  type,
  required: false,
  options: [],
});
