import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useAiChat } from '../../contexts/AiChatContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import SessionDetailHero from '../../components/SessionDetailHero';
import SessionNotesGrid from '../../components/SessionNotesGrid';
import SessionExerciseCard from '../../components/SessionExerciseCard';
import IArnoldFAB from '../../components/IArnoldFAB';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getStudentName = (student) => {
  if (!student) return null;
  if (student.firstName || student.lastName) {
    return [student.firstName, student.lastName].filter(Boolean).join(' ');
  }
  return student.email ?? null;
};

const formatSessionDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const SessionDetail = () => {
  const { studentId, sessionId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { sendMessage } = useAiChat();

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
    const trainingName = session?.training?.name ?? 'esta sessão';
    const studentName = getStudentName(student) ?? 'este aluno';
    const dateLabel = formatSessionDate(session?.startedAt);
    const prefix = dateLabel
      ? `Analise a sessão ${trainingName} de ${studentName} em ${dateLabel}`
      : `Analise a sessão ${trainingName} de ${studentName}`;
    try {
      navigate('/trainer/ai-assistant');
      await sendMessage(prefix);
    } catch (err) {
      console.error('[SessionDetail] iArnold prefill failed', translateError(err));
    } finally {
      setIArnoldSubmitting(false);
    }
  }, [iArnoldSubmitting, navigate, sendMessage, session, student]);

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
      <div className="empty-state">
        <p className="empty-state-title">Sessão não encontrada</p>
        <p className="text-muted text-sm">
          A sessão pode ter sido excluída ou não pertence a este aluno.
        </p>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleBack}
        >
          Voltar para o aluno
        </button>
      </div>
    );
  }

  const exerciseLogs = session.exerciseLogs ?? [];
  const studentName = getStudentName(student);

  return (
    <div>
      {/* Back navigation */}
      <button
        type="button"
        className="btn-back"
        onClick={handleBack}
        aria-label="Voltar para o perfil do aluno"
      >
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        {studentName ? `${studentName} · Sessões` : 'Voltar'}
      </button>

      {/* Stadium hero */}
      <SessionDetailHero session={session} />

      {/* Notes: student + trainer stub */}
      <SessionNotesGrid
        studentNote={session.notes ?? null}
        studentName={studentName}
        finishedAt={session.finishedAt ?? null}
      />

      {/* Exercise logs */}
      {exerciseLogs.length > 0 && (
        <section className="cockpit-section" aria-labelledby="session-exercises-heading">
          <header className="cockpit-section-header">
            <h2 id="session-exercises-heading" className="cockpit-section-eyebrow">
              Exercícios
              <span className="cockpit-section-eyebrow-suffix">
                · {exerciseLogs.length} exercício{exerciseLogs.length !== 1 ? 's' : ''}
              </span>
            </h2>
          </header>

          {exerciseLogs.map((log, idx) => (
            <SessionExerciseCard
              key={log.id}
              index={idx + 1}
              exerciseLog={log}
              defaultOpen={idx === 0}
            />
          ))}
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
