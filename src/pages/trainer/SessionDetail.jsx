import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, SearchX } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useAiChat } from '../../contexts/AiChatContext';
import { translateError, t, tf } from '../../i18n';
import api from '../../api/axios';
import SessionDetailHero from '../../components/SessionDetailHero';
import SessionNotesGrid from '../../components/SessionNotesGrid';
import SessionExerciseCard from '../../components/SessionExerciseCard';
import EmptyBlock from '../../components/ds/EmptyBlock';
import IArnoldFAB from '../../components/IArnoldFAB';
import BiSetBadge from '../../components/BiSetBadge';
import buildSessionExerciseEntries from '../../utils/sessionExerciseEntries';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getStudentName = (student) => {
  if (!student) return null;
  if (student.firstName || student.lastName) {
    return [student.firstName, student.lastName].filter(Boolean).join(' ');
  }
  return student.email ?? null;
};

// Renders one exercise row of the session list.
const renderExerciseRow = ({ log, replacedName }, index) => (
  <SessionExerciseCard
    key={log.id}
    index={index}
    exerciseLog={log}
    replacedExerciseName={replacedName}
    defaultOpen={index === 1}
  />
);

// Renders the entries (singles and bi-set groups) with a running 1-based index.
const renderExerciseEntries = (entries) => {
  let index = 0;
  return entries.map((entry) => {
    if (entry.kind === 'single') {
      index += 1;
      return renderExerciseRow(entry.ex, index);
    }
    return (
      <div key={entry.groupId} className="session-biset" role="group" aria-label="Bi-set">
        <div className="session-biset__header"><BiSetBadge /></div>
        {entry.members.map((member) => {
          index += 1;
          return renderExerciseRow(member, index);
        })}
      </div>
    );
  });
};

// Returns the list path the trainer came from, only when it is this student's sessions list.
const getListReturnPath = (state, studentId) => {
  const path = state?.returnTo;
  const listPath = `/trainer/students/${studentId}/sessions`;
  if (typeof path !== 'string') return null;
  const isList = path === listPath || path.startsWith(`${listPath}?`);
  return isList ? path : null;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const SessionDetail = () => {
  const { studentId, sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { startConversation } = useAiChat();

  const [session, setSession] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [iArnoldSubmitting, setIArnoldSubmitting] = useState(false);

  const fetchSession = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const [sessionRes, studentRes] = await Promise.all([
        api.get(`/trainer/students/${studentId}/workout-sessions/${sessionId}`),
        api.get('/trainer/students').catch(() => ({ data: [] })),
      ]);
      setSession(sessionRes.data);
      const found = (studentRes.data ?? []).find((s) => String(s.id) === String(studentId));
      setStudent(found ?? null);
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 403) {
        setNotFound(true);
      } else {
        showToast(err.userMessage || translateError(err), 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [studentId, sessionId, showToast]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleAskIArnold = useCallback(async () => {
    if (iArnoldSubmitting) return;
    setIArnoldSubmitting(true);
    const trainingName = session?.training?.name ?? t('iArnold.sessionPrompt.trainingFallback');
    const studentName = getStudentName(student) ?? t('iArnold.sessionPrompt.studentFallback');
    const prefix = tf('iArnold.sessionPrompt.text', { student: studentName, training: trainingName });
    try {
      navigate('/trainer/ai-assistant');
      await startConversation(prefix, { studentId });
    } catch (err) {
      console.error('[SessionDetail] iArnold prefill failed', translateError(err));
    } finally {
      setIArnoldSubmitting(false);
    }
  }, [iArnoldSubmitting, navigate, startConversation, session, student, studentId]);

  const handleBack = () => {
    navigate(getListReturnPath(location.state, studentId) ?? `/trainer/students/${studentId}`);
  };

  const handleBackToStudent = () => {
    navigate(`/trainer/students/${studentId}`);
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando...</span>
      </div>
    );
  }

  // ── Not found ──
  if (notFound || !session) {
    return (
      <div className="session-detail__not-found">
        <EmptyBlock
          icon={SearchX}
          title="Sessão não encontrada"
          description="A sessão pode ter sido excluída ou não pertence a este aluno."
        />
        <button type="button" className="btn btn--secondary" onClick={handleBackToStudent}>
          Voltar para o aluno
        </button>
      </div>
    );
  }

  const exerciseLogs = session.exerciseLogs ?? [];
  const studentName = getStudentName(student);

  return (
    <div className="session-detail">
      <button
        type="button"
        className="btn btn--ghost session-detail__back"
        onClick={handleBack}
        aria-label="Voltar para o perfil do aluno"
      >
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        {studentName ? `${studentName} · Sessões` : 'Voltar'}
      </button>

      <SessionDetailHero session={session} />

      <SessionNotesGrid
        studentNote={session.notes ?? null}
        finishedAt={session.finishedAt ?? null}
      />

      {exerciseLogs.length > 0 && (
        <section className="section-card" aria-labelledby="session-exercises-heading">
          <h2 id="session-exercises-heading" className="type-h2 session-detail__section-title">
            Exercícios da sessão
          </h2>
          <div className="session-exercises">
            {renderExerciseEntries(buildSessionExerciseEntries(exerciseLogs))}
          </div>
        </section>
      )}

      <IArnoldFAB
        label="Analisar com iArnold"
        onClick={handleAskIArnold}
        disabled={iArnoldSubmitting}
      />
    </div>
  );
};

export default SessionDetail;
