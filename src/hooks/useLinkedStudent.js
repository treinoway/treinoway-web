import { useEffect, useState } from 'react';
import api from '../api/axios';
import { extractErrorInfo, translateError } from '../i18n';
import { StudentMessageCode } from '../constants/student';

const EMPTY_RESULT = { id: null, student: null, notFound: false };

const isStudentNotLinked = (err) => extractErrorInfo(err).messageCode === StudentMessageCode.NOT_LINKED;

const matchesId = (student, id) => Boolean(student) && String(student.id) === String(id);

/**
 * Profile of one student linked to the trainer (GET /trainer/students/:id).
 *
 * - `initialStudent` (e.g. router state) renders instantly; the fetch always runs to refresh it.
 * - Fetched fields override the initial ones, so a field the API doesn't return yet
 *   (e.g. `lastWorkoutAt` before the backend ships it) keeps the initial value.
 * - Results are keyed by id: a late response for a previous id is ignored and never shown.
 * - A 404 `student.notLinked` sets `notFound`; other errors are toasted.
 */
const useLinkedStudent = (id, initialStudent, showToast) => {
  const [result, setResult] = useState(EMPTY_RESULT);

  useEffect(() => {
    let ignore = false;
    api.get(`/trainer/students/${id}`)
      .then((response) => {
        if (!ignore) setResult({ id, student: response.data, notFound: false });
      })
      .catch((err) => {
        if (ignore) return;
        if (isStudentNotLinked(err)) {
          setResult({ id, student: null, notFound: true });
          return;
        }
        showToast(err.userMessage || translateError(err), 'error');
      });
    return () => { ignore = true; };
  }, [id, showToast]);

  const isCurrent = result.id === id;
  const fromInitial = matchesId(initialStudent, id) ? initialStudent : null;
  const fetched = isCurrent ? result.student : null;
  const student = fetched ? { ...fromInitial, ...fetched } : fromInitial;

  return { student, notFound: isCurrent && result.notFound };
};

export default useLinkedStudent;
