import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import api from './axios';
import {
  listStudentFeedbacks,
  getStudentFeedbackUnreadCount,
  markStudentFeedbackRead,
  getStudentFeedbackHistory,
  sendAdhocStudentFeedback,
  getStudentFeedbackConfig,
  updateStudentFeedbackConfig,
} from './studentFeedback';

const BASE_URL = '/trainer/student-feedbacks';
const CONFIG = { autoSendEnabled: true, d7: true, d15: true, d21: true, d30: true, recurring: true };

describe('studentFeedback api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists the inbox with the status filter only when no milestone is chosen', async () => {
    const payload = { summary: { responseRate30d: 82, averageIndex: 71, unansweredCount: 3, unreadCount: 2 }, items: [] };
    api.get.mockResolvedValue({ data: payload });

    const result = await listStudentFeedbacks({ status: 'unread' });

    expect(api.get).toHaveBeenCalledWith(BASE_URL, { params: { status: 'unread' } });
    expect(result).toEqual(payload);
  });

  it('lists the inbox with status and milestone when a milestone is chosen', async () => {
    api.get.mockResolvedValue({ data: { summary: {}, items: [] } });

    await listStudentFeedbacks({ status: 'all', milestone: 'D15' });

    expect(api.get).toHaveBeenCalledWith(BASE_URL, { params: { status: 'all', milestone: 'D15' } });
  });

  it('returns the unread count as a number', async () => {
    api.get.mockResolvedValue({ data: { count: 4 } });

    const count = await getStudentFeedbackUnreadCount();

    expect(api.get).toHaveBeenCalledWith(`${BASE_URL}/unread-count`);
    expect(count).toBe(4);
  });

  it('marks a feedback as read', async () => {
    api.patch.mockResolvedValue({ data: { id: 'fb-1', readAt: '2026-11-12T15:00:00.000Z' } });

    const result = await markStudentFeedbackRead('fb-1');

    expect(api.patch).toHaveBeenCalledWith(`${BASE_URL}/fb-1/read`);
    expect(result).toEqual({ id: 'fb-1', readAt: '2026-11-12T15:00:00.000Z' });
  });

  it('loads the feedback history of a student', async () => {
    const payload = { student: { id: 'student-1', name: 'Ana Souza', avatarUrl: null }, hasPending: false, feedbacks: [] };
    api.get.mockResolvedValue({ data: payload });

    const result = await getStudentFeedbackHistory('student-1');

    expect(api.get).toHaveBeenCalledWith('/trainer/students/student-1/feedbacks');
    expect(result).toEqual(payload);
  });

  it('sends an ad-hoc feedback request to a student', async () => {
    const created = { id: 'fb-9', milestone: 'ADHOC', milestoneLabel: 'Avulso', status: 'pending', statusLabel: 'Pendente', sentAt: '2026-11-17T15:00:00.000Z', expiresAt: '2026-11-20T15:00:00.000Z' };
    api.post.mockResolvedValue({ data: created });

    const result = await sendAdhocStudentFeedback('student-1');

    expect(api.post).toHaveBeenCalledWith('/trainer/students/student-1/feedbacks');
    expect(result).toEqual(created);
  });

  it('loads the config', async () => {
    api.get.mockResolvedValue({ data: CONFIG });

    const result = await getStudentFeedbackConfig();

    expect(api.get).toHaveBeenCalledWith(`${BASE_URL}/config`);
    expect(result).toEqual(CONFIG);
  });

  it('saves the given config fields and returns the full config', async () => {
    api.put.mockResolvedValue({ data: { ...CONFIG, d21: false } });

    const result = await updateStudentFeedbackConfig({ d21: false });

    expect(api.put).toHaveBeenCalledWith(`${BASE_URL}/config`, { d21: false });
    expect(result).toEqual({ ...CONFIG, d21: false });
  });

  it('lets the request error reach the caller untouched', async () => {
    const error = { userMessage: 'Feedback não encontrado.' };
    api.patch.mockRejectedValue(error);

    await expect(markStudentFeedbackRead('fb-1')).rejects.toBe(error);
  });
});
