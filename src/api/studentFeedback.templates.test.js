import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import api from './axios';
import * as studentFeedbackApi from './studentFeedback';

const TEMPLATES_URL = '/trainer/student-feedbacks/templates';
const MILESTONE_TEMPLATES_URL = '/trainer/student-feedbacks/milestone-templates';
const STUDENT_URL = '/trainer/students/student-1/feedbacks';

const QUESTION = {
  id: 'q-1',
  order: 1,
  text: 'Como foi sua adesão ao treino?',
  helpText: null,
  type: 'score',
  typeLabel: 'Nota',
  pillar: 'training_adherence',
  pillarLabel: 'Adesão (treino)',
  required: true,
  condition: null,
  invertScore: false,
  minLabel: 'Não treinei',
  maxLabel: 'Treinei tudo',
};
const TEMPLATE = { id: 'tpl-2', name: 'Avaliação mensal', isGeneral: false, version: 2, hasRequests: true, milestones: ['D30'], questions: [QUESTION] };
const LIST_ITEM = { id: 'tpl-2', name: 'Avaliação mensal', isGeneral: false, version: 2, questionCount: 1, milestones: ['D30'], updatedAt: '2026-11-10T12:00:00.000Z' };
const MILESTONE_TEMPLATES = { d7: null, d15: null, d21: null, d30: 'tpl-2', recurring: null };
const SAVE_BODY = {
  name: 'Avaliação mensal',
  questions: [{ text: 'Como foi sua adesão ao treino?', type: 'score', pillar: 'training_adherence', required: true, invertScore: false }],
};

describe('studentFeedback api — templates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists the templates and returns the array', async () => {
    api.get.mockResolvedValue({ data: { templates: [LIST_ITEM] } });

    const result = await studentFeedbackApi.listStudentFeedbackTemplates();

    expect(api.get).toHaveBeenCalledWith(TEMPLATES_URL);
    expect(result).toEqual([LIST_ITEM]);
  });

  it('loads one template by id and returns the template', async () => {
    api.get.mockResolvedValue({ data: { template: TEMPLATE } });

    const result = await studentFeedbackApi.getStudentFeedbackTemplate('tpl-2');

    expect(api.get).toHaveBeenCalledWith(`${TEMPLATES_URL}/tpl-2`);
    expect(result).toEqual(TEMPLATE);
  });

  it('duplicates a template with no body and returns the new template', async () => {
    const copy = { ...TEMPLATE, id: 'tpl-9', name: 'Avaliação mensal (cópia)', version: 1, hasRequests: false, milestones: [] };
    api.post.mockResolvedValue({ data: { template: copy } });

    const result = await studentFeedbackApi.duplicateStudentFeedbackTemplate('tpl-2');

    expect(api.post.mock.calls).toEqual([[`${TEMPLATES_URL}/tpl-2/duplicate`]]);
    expect(result).toEqual(copy);
  });

  it('saves name and questions with one PUT and returns the saved template, which may carry a new id', async () => {
    const newVersion = { ...TEMPLATE, id: 'tpl-3', version: 3, hasRequests: false };
    api.put.mockResolvedValue({ data: { template: newVersion } });

    const result = await studentFeedbackApi.saveStudentFeedbackTemplate('tpl-2', SAVE_BODY);

    expect(api.put.mock.calls).toEqual([[`${TEMPLATES_URL}/tpl-2`, SAVE_BODY]]);
    expect(result).toEqual(newVersion);
  });

  it('deletes a template', async () => {
    api.delete.mockResolvedValue({ status: 204, data: '' });

    await studentFeedbackApi.deleteStudentFeedbackTemplate('tpl-2');

    expect(api.delete).toHaveBeenCalledWith(`${TEMPLATES_URL}/tpl-2`);
    expect(api.delete).toHaveBeenCalledTimes(1);
  });

  it('loads the template of each milestone and returns the map', async () => {
    api.get.mockResolvedValue({ data: { milestoneTemplates: MILESTONE_TEMPLATES } });

    const result = await studentFeedbackApi.getStudentFeedbackMilestoneTemplates();

    expect(api.get).toHaveBeenCalledWith(MILESTONE_TEMPLATES_URL);
    expect(result).toEqual(MILESTONE_TEMPLATES);
  });

  it('saves only the given milestones and returns the full map', async () => {
    const saved = { ...MILESTONE_TEMPLATES, d7: 'tpl-2', d30: null };
    api.put.mockResolvedValue({ data: { milestoneTemplates: saved } });

    const result = await studentFeedbackApi.updateStudentFeedbackMilestoneTemplates({ d7: 'tpl-2', d30: null });

    expect(api.put.mock.calls).toEqual([[MILESTONE_TEMPLATES_URL, { d7: 'tpl-2', d30: null }]]);
    expect(result).toEqual(saved);
  });

  it('sends the ad-hoc feedback with the chosen template in the body', async () => {
    const created = { id: 'fb-9', milestone: 'ADHOC', milestoneLabel: 'Avulso', status: 'pending', statusLabel: 'Pendente', sentAt: '2026-11-17T15:00:00.000Z', expiresAt: '2026-11-20T15:00:00.000Z' };
    api.post.mockResolvedValue({ data: created });

    const result = await studentFeedbackApi.sendAdhocStudentFeedback('student-1', 'tpl-2');

    expect(api.post.mock.calls).toEqual([[STUDENT_URL, { templateId: 'tpl-2' }]]);
    expect(result).toEqual(created);
  });

  it.each([[undefined], [null], ['']])('sends the ad-hoc feedback with no body when the template is %s', async (templateId) => {
    api.post.mockResolvedValue({ data: { id: 'fb-9' } });

    await studentFeedbackApi.sendAdhocStudentFeedback('student-1', templateId);

    expect(api.post.mock.calls).toEqual([[STUDENT_URL]]);
  });

  it('lets a template request error reach the caller untouched', async () => {
    const error = { userMessage: 'Modelo de feedback não encontrado.' };
    api.put.mockRejectedValue(error);

    await expect(studentFeedbackApi.saveStudentFeedbackTemplate('tpl-2', SAVE_BODY)).rejects.toBe(error);
  });
});
