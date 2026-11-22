import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '../test/test-utils';
import useStudentFeedbackInbox from './useStudentFeedbackInbox';
import api from '../api/axios';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const showToast = vi.fn();
vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));

const BASE_URL = '/trainer/student-feedbacks';
const UNREAD_EVENT = 'treinoway:student-feedback-unread-changed';
const READ_AT = '2026-11-13T15:00:00.000Z';

// Inbox item with the fields of the trainer API; overrides replace any of them
const buildItem = (overrides = {}) => ({
  id: 'fb-1',
  student: { id: 'student-1', name: 'Ana Souza', avatarUrl: null },
  milestone: 'D7',
  milestoneLabel: 'D7',
  status: 'answered',
  statusLabel: 'Respondido',
  submittedAt: '2026-11-10T15:00:00.000Z',
  readAt: null,
  overallIndex: 42,
  band: 'attention',
  bandLabel: 'Atenção',
  ...overrides,
});

const ANA = buildItem();
const BRUNO = buildItem({ id: 'fb-2', student: { id: 'student-2', name: 'Bruno Lima', avatarUrl: null }, milestone: 'D15', milestoneLabel: 'D15', readAt: '2026-11-11T18:00:00.000Z' });
const CARLA = buildItem({ id: 'fb-3', student: { id: 'student-3', name: 'Carla Dias', avatarUrl: null }, milestone: 'D30', milestoneLabel: 'D30' });
const DAVI = buildItem({ id: 'fb-4', student: { id: 'student-4', name: 'Davi Rocha', avatarUrl: null }, milestone: 'D21', milestoneLabel: 'D21', status: 'expired', statusLabel: 'Expirado', submittedAt: null, overallIndex: null, band: null, bandLabel: null });

let inbox = [];
let announced = [];

// Whether the item is an answered feedback the trainer has not read yet
const isUnread = (item) => item.status === 'answered' && item.readAt === null;

// Whether the item matches the status and milestone asked for
const matchesParams = (item, params) => {
  if (params.status === 'unread' && !isUnread(item)) return false;
  if (params.status === 'unanswered' && item.status !== 'expired') return false;
  return !params.milestone || item.milestone === params.milestone;
};

// Inbox payload of the service for the request params; the summary ignores the filters
const buildPayload = (params) => ({
  summary: {
    responseRate30d: 82,
    averageIndex: 64,
    unansweredCount: inbox.filter((item) => item.status === 'expired').length,
    unreadCount: inbox.filter(isUnread).length,
  },
  items: inbox.filter((item) => matchesParams(item, params)),
});

// Routes the requests by URL; the read request stamps the given date without touching what later list requests answer
const mockApi = (items = [ANA, BRUNO, CARLA, DAVI]) => {
  inbox = items.map((item) => ({ ...item }));
  api.get.mockImplementation((url, options) => {
    if (url === BASE_URL) return Promise.resolve({ data: buildPayload(options?.params ?? {}) });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
  api.patch.mockImplementation((url) => Promise.resolve({ data: { id: url.split('/').at(-2), readAt: READ_AT } }));
};

// Remembers every unread count announced on window
const recordAnnouncement = (event) => {
  announced.push(event.detail.count);
};

// Renders the hook and waits for the first payload
const renderInbox = async () => {
  const view = renderHook(() => useStudentFeedbackInbox());
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
};

// Ids of the items the hook currently exposes
const idsOf = (result) => result.current.data.items.map((item) => item.id);

// How many list requests were made
const listRequests = () => api.get.mock.calls.filter(([url]) => url === BASE_URL);

beforeEach(() => {
  vi.clearAllMocks();
  announced = [];
  window.addEventListener(UNREAD_EVENT, recordAnnouncement);
  mockApi();
});

afterEach(() => {
  window.removeEventListener(UNREAD_EVENT, recordAnnouncement);
});

describe('useStudentFeedbackInbox: loading and filters', () => {
  it('starts loading with the "all" status, no milestone and no data', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useStudentFeedbackInbox());

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.status).toBe('all');
    expect(result.current.milestone).toBeNull();
    expect(result.current.markingId).toBeNull();
  });

  it('asks for every feedback on the first load, sending no milestone', async () => {
    const { result } = await renderInbox();

    expect(api.get).toHaveBeenCalledWith(BASE_URL, { params: { status: 'all' } });
    expect(listRequests()).toHaveLength(1);
    expect(idsOf(result)).toEqual(['fb-1', 'fb-2', 'fb-3', 'fb-4']);
    expect(result.current.data.summary.unreadCount).toBe(2);
  });

  it('re-queries with the chosen status', async () => {
    const { result } = await renderInbox();

    act(() => result.current.setStatus('unanswered'));

    await waitFor(() => expect(idsOf(result)).toEqual(['fb-4']));
    expect(api.get).toHaveBeenLastCalledWith(BASE_URL, { params: { status: 'unanswered' } });
    expect(result.current.status).toBe('unanswered');
  });

  it('re-queries with the chosen milestone next to the status, and drops it again when cleared', async () => {
    const { result } = await renderInbox();

    act(() => result.current.setMilestone('D30'));
    await waitFor(() => expect(idsOf(result)).toEqual(['fb-3']));
    expect(api.get).toHaveBeenLastCalledWith(BASE_URL, { params: { status: 'all', milestone: 'D30' } });

    act(() => result.current.setMilestone(null));
    await waitFor(() => expect(idsOf(result)).toHaveLength(4));
    expect(api.get).toHaveBeenLastCalledWith(BASE_URL, { params: { status: 'all' } });
  });

  it('reports loading again while a new filter is being fetched', async () => {
    const { result } = await renderInbox();

    act(() => result.current.setStatus('unread'));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('exposes the API message when the request fails and recovers with reload', async () => {
    api.get.mockRejectedValue({ userMessage: 'Erro ao carregar feedbacks.' });
    const { result } = renderHook(() => useStudentFeedbackInbox());

    await waitFor(() => expect(result.current.error).toBe('Erro ao carregar feedbacks.'));
    expect(result.current.data).toBeNull();

    mockApi();
    act(() => {
      result.current.reload();
    });

    expect(result.current.error).toBeNull();
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.error).toBeNull();
    expect(idsOf(result)).toHaveLength(4);
  });

  it('hides the previous error while another filter is loading', async () => {
    api.get.mockRejectedValue({ userMessage: 'Erro ao carregar feedbacks.' });
    const { result } = renderHook(() => useStudentFeedbackInbox());
    await waitFor(() => expect(result.current.error).toBe('Erro ao carregar feedbacks.'));

    api.get.mockImplementation(() => new Promise(() => {}));
    act(() => result.current.setStatus('unread'));

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });
});

describe('useStudentFeedbackInbox: unread count announcement', () => {
  it('announces the unread count of the summary once the inbox loads', async () => {
    await renderInbox();

    await waitFor(() => expect(announced).toEqual([2]));
  });

  it('announces nothing when the request fails', async () => {
    api.get.mockRejectedValue({ userMessage: 'Erro ao carregar feedbacks.' });
    const { result } = renderHook(() => useStudentFeedbackInbox());

    await waitFor(() => expect(result.current.error).toBe('Erro ao carregar feedbacks.'));

    expect(announced).toEqual([]);
  });

  it('announces nothing when the summary carries no numeric unread count', async () => {
    api.get.mockResolvedValue({ data: { summary: { unreadCount: null }, items: [] } });
    const { result } = renderHook(() => useStudentFeedbackInbox());

    await waitFor(() => expect(result.current.data).not.toBeNull());

    expect(announced).toEqual([]);
  });

  it('announces the lower count after a feedback is marked as read', async () => {
    const { result } = await renderInbox();
    await waitFor(() => expect(announced).toEqual([2]));

    await act(() => result.current.markRead('fb-1'));

    await waitFor(() => expect(announced).toEqual([2, 1]));
  });
});

describe('useStudentFeedbackInbox: mark as read', () => {
  it('sends the read request for the feedback and reports it as the one being marked meanwhile', async () => {
    let finishRead;
    api.patch.mockImplementation(() => new Promise((resolve) => {
      finishRead = resolve;
    }));
    const { result } = await renderInbox();

    let marking;
    act(() => {
      marking = result.current.markRead('fb-1');
    });

    expect(result.current.markingId).toBe('fb-1');
    expect(api.patch).toHaveBeenCalledWith(`${BASE_URL}/fb-1/read`);
    await act(async () => {
      finishRead({ data: { id: 'fb-1', readAt: READ_AT } });
      await marking;
    });
    expect(result.current.markingId).toBeNull();
  });

  it('keeps the row, now read, and lowers the unread count under the "all" filter, without re-querying', async () => {
    const { result } = await renderInbox();

    await act(() => result.current.markRead('fb-1'));

    expect(idsOf(result)).toEqual(['fb-1', 'fb-2', 'fb-3', 'fb-4']);
    expect(result.current.data.items[0].readAt).toBe(READ_AT);
    expect(result.current.data.items[2].readAt).toBeNull();
    expect(result.current.data.summary.unreadCount).toBe(1);
    expect(listRequests()).toHaveLength(1);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('takes the row out of the list under the "unread" filter and lowers the unread count', async () => {
    const { result } = await renderInbox();
    act(() => result.current.setStatus('unread'));
    await waitFor(() => expect(idsOf(result)).toEqual(['fb-1', 'fb-3']));

    await act(() => result.current.markRead('fb-1'));

    expect(idsOf(result)).toEqual(['fb-3']);
    expect(result.current.data.summary.unreadCount).toBe(1);
    expect(result.current.status).toBe('unread');
    expect(listRequests()).toHaveLength(2);
  });

  it('empties the "unread" list when the last unread feedback is read', async () => {
    mockApi([ANA, BRUNO]);
    const { result } = await renderInbox();
    act(() => result.current.setStatus('unread'));
    await waitFor(() => expect(idsOf(result)).toEqual(['fb-1']));

    await act(() => result.current.markRead('fb-1'));

    expect(idsOf(result)).toEqual([]);
    expect(result.current.data.summary.unreadCount).toBe(0);
  });

  it('changes nothing when the service stamps no read date', async () => {
    api.patch.mockResolvedValue({ data: { id: 'fb-1', readAt: null } });
    const { result } = await renderInbox();

    await act(() => result.current.markRead('fb-1'));

    expect(result.current.data.items[0].readAt).toBeNull();
    expect(result.current.data.summary.unreadCount).toBe(2);
    expect(result.current.markingId).toBeNull();
  });

  it('shows the API message, keeps the feedback unread and frees the row when the request fails', async () => {
    api.patch.mockRejectedValue({ userMessage: 'Feedback não encontrado.' });
    const { result } = await renderInbox();

    await act(() => result.current.markRead('fb-1'));

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith('Feedback não encontrado.', 'error');
    expect(result.current.data.items[0].readAt).toBeNull();
    expect(result.current.data.summary.unreadCount).toBe(2);
    expect(result.current.markingId).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('keeps the row under the "unread" filter when the request fails', async () => {
    api.patch.mockRejectedValue({ userMessage: 'Feedback não encontrado.' });
    const { result } = await renderInbox();
    act(() => result.current.setStatus('unread'));
    await waitFor(() => expect(idsOf(result)).toEqual(['fb-1', 'fb-3']));

    await act(() => result.current.markRead('fb-1'));

    expect(idsOf(result)).toEqual(['fb-1', 'fb-3']);
    expect(showToast).toHaveBeenCalledWith('Feedback não encontrado.', 'error');
  });
});
