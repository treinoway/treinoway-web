const opt = (text, order) => ({ id: `opt-${text}`, text, order });

export const wizardAnamnesis = {
  id: 'anamnesis-1',
  title: 'Anamnese de Saúde',
  description: null,
  isGeneral: false,
  sections: [
    {
      id: 'sec-3',
      title: 'Objetivos',
      description: null,
      order: 2,
      questions: [
        { id: 'q-goal', text: 'Qual seu objetivo?', type: 'free_text', required: true, order: 0, options: [], config: null },
        { id: 'q-note', text: 'Alguma observação?', type: 'free_text', required: false, order: 1, options: [], config: null },
      ],
    },
    {
      id: 'sec-1',
      title: 'Saúde',
      description: 'Conte sobre sua saúde.',
      order: 0,
      questions: [
        {
          id: 'q-years',
          text: 'Há quantos anos você treina?',
          type: 'numeric',
          required: true,
          order: 1,
          options: [],
          config: { min: '1', max: '50', unit: 'anos' },
          parentQuestionId: 'q-train',
          condition: { operator: 'equals', value: 'yes' },
        },
        {
          id: 'q-train',
          text: 'Você treina atualmente?',
          type: 'dichotomous',
          required: true,
          order: 0,
          options: [],
          config: null,
          parentQuestionId: null,
          condition: null,
        },
      ],
    },
    {
      id: 'sec-2',
      title: 'Rotina',
      description: null,
      order: 1,
      questions: [
        {
          id: 'q-shift',
          text: 'Qual turno prefere?',
          type: 'single_choice',
          required: true,
          order: 0,
          options: [opt('Manhã', 0), opt('Noite', 1)],
          config: null,
        },
        {
          id: 'q-activities',
          text: 'Quais atividades pratica?',
          type: 'multiple_choice',
          required: false,
          order: 1,
          options: [opt('Corrida', 0), opt('Yoga', 1), opt('Natação', 2)],
          config: null,
        },
      ],
    },
    { id: 'sec-empty', title: 'Vazia', description: null, order: 3, questions: [] },
  ],
};

export const singleSectionAnamnesis = {
  ...wizardAnamnesis,
  sections: [wizardAnamnesis.sections[1]],
};

export const wizardLink = {
  id: 'link-1',
  anamnesisId: 'anamnesis-1',
  createdAt: '2026-01-15T10:00:00.000Z',
  anamnesis: wizardAnamnesis,
  trainer: { id: 'trainer-1', user: { firstName: 'João', lastName: 'Silva' } },
};

export const wizardResponse = {
  id: 'response-1',
  submittedAt: '2026-03-01T10:00:00.000Z',
  answers: [
    { questionId: 'q-train', value: 'yes' },
    { questionId: 'q-years', value: 5 },
    { questionId: 'q-shift', value: 'Noite' },
    { questionId: 'q-activities', value: ['Corrida'] },
    { questionId: 'q-goal', value: 'Ganhar massa' },
  ],
};
