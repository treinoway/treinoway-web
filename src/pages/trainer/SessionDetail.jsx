import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getStudentName = (student) => {
  if (!student) return null;
  if (student.firstName || student.lastName) {
    return [student.firstName, student.lastName].filter(Boolean).join(' ');
  }
  return student.email ?? null;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const SessionDetail = () => {
  const { studentId, sessionId } = useParams();
  const navigate = useNavigate();
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
        <button type="button" className="btn btn--secondary" onClick={handleBack}>
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
            {exerciseLogs.map((log, idx) => (
              <SessionExerciseCard
                key={log.id}
                index={idx + 1}
                exerciseLog={log}
                defaultOpen={idx === 0}
              />
            ))}
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
