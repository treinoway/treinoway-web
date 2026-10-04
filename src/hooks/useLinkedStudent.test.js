import { act, renderHook, waitFor } from '../test/test-utils';
import api from '../api/axios';
import useLinkedStudent from './useLinkedStudent';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const studentA = { id: 'student-a', firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com' };
const studentB = { id: 'student-b', firstName: 'Bruno', lastName: 'Reis', email: 'bruno@example.com' };

const notLinkedError = () => ({
  response: { status: 404, data: { error: 'NOT_FOUND', messageCode: 'student.notLinked', message: 'No link' } },
});

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

const renderLinkedStudent = (initialProps) => {
  const showToast = vi.fn();
  const hook = renderHook(
    ({ id, initialStudent = null }) => useLinkedStudent(id, initialStudent, showToast),
    { initialProps },
  );
  return { ...hook, showToast };
};

describe('useLinkedStudent', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches the student by id instead of the whole roster', async () => {
    api.get.mockResolvedValue({ data: { ...studentA, lastWorkoutAt: '2026-10-01T10:00:00.000Z' } });
    const { result } = renderLinkedStudent({ id: 'student-a' });
    expect(result.current.student).toBeNull();
    await waitFor(() => expect(result.current.student?.firstName).toBe('Ana'));
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/trainer/students/student-a');
    expect(result.current.student.lastWorkoutAt).toBe('2026-10-01T10:00:00.000Z');
    expect(result.current.notFound).toBe(false);
  });

  it('renders the initial student instantly and refreshes it with the fetched one', async () => {
    const pending = deferred();
    api.get.mockReturnValue(pending.promise);
    const { result } = renderLinkedStudent({ id: 'student-a', initialStudent: studentA });
    expect(result.current.student).toEqual(studentA);
    expect(api.get).toHaveBeenCalledWith('/trainer/students/student-a');

    await act(async () => { pending.resolve({ data: { ...studentA, firstName: 'Ana Paula', lastWorkoutAt: null } }); });
    expect(result.current.student.firstName).toBe('Ana Paula');
    expect(result.current.student.lastWorkoutAt).toBeNull();
  });

  it('keeps lastWorkoutAt undefined when neither source has it', async () => {
    api.get.mockResolvedValue({ data: studentA });
    const { result } = renderLinkedStudent({ id: 'student-a' });
    await waitFor(() => expect(result.current.student).not.toBeNull());
    expect(result.current.student.lastWorkoutAt).toBeUndefined();
  });

  it('ignores an initial student that belongs to another id', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    const { result } = renderLinkedStudent({ id: 'student-b', initialStudent: studentA });
    expect(result.current.student).toBeNull();
  });

  it('flags notFound on 404 student.notLinked without a toast', async () => {
    api.get.mockRejectedValue(notLinkedError());
    const { result, showToast } = renderLinkedStudent({ id: 'student-a' });
    await waitFor(() => expect(result.current.notFound).toBe(true));
    expect(result.current.student).toBeNull();
    expect(showToast).not.toHaveBeenCalled();
  });

  it('toasts other errors and keeps the initial student', async () => {
    api.get.mockRejectedValue({ userMessage: 'Erro ao carregar aluno' });
    const { result, showToast } = renderLinkedStudent({ id: 'student-a', initialStudent: studentA });
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Erro ao carregar aluno', 'error'));
    expect(result.current.student).toEqual(studentA);
    expect(result.current.notFound).toBe(false);
  });

  describe('when the id changes', () => {
    it('ignores a late response for the previous student', async () => {
      const lateA = deferred();
      api.get.mockImplementation((url) => (
        url.endsWith('student-a') ? lateA.promise : Promise.resolve({ data: studentB })
      ));
      const { result, rerender } = renderLinkedStudent({ id: 'student-a' });

      rerender({ id: 'student-b' });
      await waitFor(() => expect(result.current.student?.firstName).toBe('Bruno'));

      await act(async () => { lateA.resolve({ data: studentA }); });
      expect(result.current.student.firstName).toBe('Bruno');
    });

    it('drops the previous student until the new one answers', async () => {
      api.get.mockResolvedValueOnce({ data: studentA }).mockReturnValueOnce(new Promise(() => {}));
      const { result, rerender } = renderLinkedStudent({ id: 'student-a' });
      await waitFor(() => expect(result.current.student?.firstName).toBe('Ana'));

      rerender({ id: 'student-b' });
      expect(result.current.student).toBeNull();
    });

    it('ignores a late not-linked error for the previous student', async () => {
      const lateA = deferred();
      api.get.mockImplementation((url) => (
        url.endsWith('student-a') ? lateA.promise : Promise.resolve({ data: studentB })
      ));
      const { result, rerender } = renderLinkedStudent({ id: 'student-a' });
      rerender({ id: 'student-b' });
      await waitFor(() => expect(result.current.student?.firstName).toBe('Bruno'));

      await act(async () => { lateA.reject(notLinkedError()); });
      expect(result.current.notFound).toBe(false);
      expect(result.current.student.firstName).toBe('Bruno');
    });
  });
});
