import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import api from './axios';
import * as studentFeedbackApi from './studentFeedback';

const TEMPLATES_URL = '/trainer/student-feedbacks/templates';

const QUESTION = {
  id: 'q-1',
  order: 1,
  text: 'Como foi sua semana?',
  helpText: null,
  type: 'score',
  typeLabel: 'Nota',
  pillar: 'other',
  pillarLabel: 'Outro',
  required: true,
  condition: null,
  invertScore: false,
  minLabel: null,
  maxLabel: null,
};
const CREATED = { id: 'tpl-created', name: 'Avaliação trimestral', isGeneral: false, version: 1, hasRequests: false, milestones: [], questions: [QUESTION] };

describe('studentFeedback api — create template', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a template from a source with one POST carrying the name and the source id, and returns the template', async () => {
    api.post.mockResolvedValue({ status: 201, data: { template: CREATED } });

    const result = await studentFeedbackApi.createStudentFeedbackTemplate({ name: 'Avaliação trimestral', sourceTemplateId: 'tpl-general' });

    expect(api.post.mock.calls).toEqual([[TEMPLATES_URL, { name: 'Avaliação trimestral', sourceTemplateId: 'tpl-general' }]]);
    expect(result).toEqual(CREATED);
  });

  it.each([
    ['is left out', { name: 'Avaliação trimestral' }],
    ['is undefined', { name: 'Avaliação trimestral', sourceTemplateId: undefined }],
  ])('creates a blank template with only the name in the body when the source %s', async (_case, input) => {
    api.post.mockResolvedValue({ status: 201, data: { template: CREATED } });

    const result = await studentFeedbackApi.createStudentFeedbackTemplate(input);

    expect(api.post.mock.calls).toEqual([[TEMPLATES_URL, { name: 'Avaliação trimestral' }]]);
    expect(result).toEqual(CREATED);
  });

  it('lets the request error of a create reach the caller untouched', async () => {
    const error = { userMessage: 'Modelo de feedback inválido.' };
    api.post.mockRejectedValue(error);

    await expect(studentFeedbackApi.createStudentFeedbackTemplate({ name: 'Avaliação trimestral' })).rejects.toBe(error);
  });
});
