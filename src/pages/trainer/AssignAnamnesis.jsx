import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Check, Eye, Search } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import AnamnesisPreviewModal from '../../components/AnamnesisPreviewModal';

/* ── helpers ─────────────────────────────────────────────── */

const getAvatarColorClass = (id) => {
  const code = String(id ?? '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return `avatar-color-${code % 6}`;
};

const getStudentInitials = (student) => {
  const first = student.firstName?.charAt(0) ?? '';
  const last = student.lastName?.charAt(0) ?? '';
  return (first + last).toUpperCase() || student.email?.charAt(0).toUpperCase() || '?';
};

const getStudentLabel = (student) => {
  if (student.firstName || student.lastName) {
    return [student.firstName, student.lastName].filter(Boolean).join(' ');
  }
  return student.email ?? '—';
};

const countQuestions = (anamnesis) =>
  (anamnesis.sections ?? []).reduce(
    (acc, s) => acc + (s.questions ?? []).length,
    0,
  );

/* ── component ───────────────────────────────────────────── */

const AssignAnamnesis = () => {
  const { anamnesisId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const [anamnesis, setAnamnesis] = useState(null);
  const [students, setStudents] = useState([]);
  const [linkedSet, setLinkedSet] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('students');

  const from = location.state?.from ?? null;
  const handleBack = useCallback(() => {
    if (from) navigate(from);
    else navigate(-1);
  }, [from, navigate]);

  /* fetch on mount */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [aRes, sRes] = await Promise.all([
          api.get(`/trainer/anamneses/${anamnesisId}`),
          api.get('/trainer/students'),
        ]);

        if (cancelled) return;

        const studentList = sRes.data;
        setAnamnesis(aRes.data);
        setStudents(studentList);

        const linkResults = await Promise.allSettled(
          studentList.map((s) =>
            api.get(`/trainer/students/${s.id}/anamneses`),
          ),
        );

        if (cancelled) return;

        const linked = new Set();
        linkResults.forEach((result, i) => {
          if (result.status === 'fulfilled') {
            const links = result.value.data ?? [];
            const isLinked = links.some((l) => l.anamnesis?.id === anamnesisId || l.anamnesisId === anamnesisId);
            if (isLinked) linked.add(studentList[i].id);
          }
        });
        setLinkedSet(linked);
      } catch (err) {
        if (cancelled) return;
        showToast(err.userMessage || translateError(err), 'error');
        navigate(-1);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [anamnesisId, navigate, showToast]);

  /* filtered student list */
  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        getStudentLabel(s).toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q),
    );
  }, [students, search]);

  const toggleStudent = (id) => {
    if (linkedSet.has(id)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selected.size === 0 || submitting) return;
    setSubmitting(true);

    const ids = [...selected];
    const results = await Promise.allSettled(
      ids.map((id) =>
        api.post(`/trainer/students/${id}/anamneses`, { anamnesisId }),
      ),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - succeeded;

    if (failed === 0) {
      showToast(`${succeeded} ${succeeded === 1 ? 'aluno vinculado' : 'alunos vinculados'} com sucesso`, 'success');
      handleBack();
    } else if (succeeded > 0) {
      showToast(`${succeeded} de ${ids.length} vinculados — ${failed} ${failed === 1 ? 'falhou' : 'falharam'}`, 'warning');
      setSubmitting(false);
    } else {
      showToast('Nenhum aluno foi vinculado. Tente novamente.', 'error');
      setSubmitting(false);
    }
  };

  /* loading */
  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando...</span>
      </div>
    );
  }

  const totalSections = (anamnesis?.sections ?? []).length;
  const totalQuestions = anamnesis ? countQuestions(anamnesis) : 0;
  const selectedCount = selected.size;

  /* ── render ──────────────────────────────────────────────── */

  const studentList = (
    <>
      <div className="assign-students-search">
        <div className="search-input-wrap">
          <Search size={14} strokeWidth={2} />
          <input
            type="text"
            placeholder="Buscar aluno por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="assign-students-list">
        {filteredStudents.length === 0 && (
          <p style={{ padding: 'var(--spacing-lg)', fontSize: 13, color: 'var(--brand-steel)' }}>
            Nenhum aluno encontrado.
          </p>
        )}
        {filteredStudents.map((student) => {
          const isLinked = linkedSet.has(student.id);
          const isChecked = selected.has(student.id);
          return (
            <button
              key={student.id}
              type="button"
              className={`student-checkbox${isChecked ? ' student-checkbox--checked' : ''}`}
              onClick={() => toggleStudent(student.id)}
              disabled={isLinked}
              aria-pressed={isChecked}
            >
              <span className="student-checkbox-box">
                {isChecked && <Check size={11} strokeWidth={3} />}
              </span>
              <span
                className={`student-checkbox-avatar ${getAvatarColorClass(student.id)}`}
              >
                {getStudentInitials(student)}
              </span>
              <span className="student-checkbox-info">
                <span className="student-checkbox-name">{getStudentLabel(student)}</span>
                <span className="student-checkbox-email">{student.email}</span>
              </span>
              {isLinked && (
                <span className="badge badge-warning" style={{ fontSize: 9, flexShrink: 0 }}>
                  Já vinculada
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );

  const configPanel = (
    <div className="assign-config">
      <div className="assign-preview-card">
        <p className="eyebrow" style={{ marginBottom: 'var(--spacing-xs)' }}>Template Selecionado</p>
        <p className="assign-preview-title">{anamnesis?.title}</p>
        <div className="assign-preview-meta">
          <span className="badge badge-neutral">v{anamnesis?.version ?? 1}</span>
          <span style={{ fontSize: 12, color: 'var(--brand-steel)' }}>
            {totalSections} {totalSections === 1 ? 'seção' : 'seções'} · {totalQuestions} {totalQuestions === 1 ? 'pergunta' : 'perguntas'}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="btn-secondary btn-sm"
        onClick={() => setPreviewOpen(true)}
      >
        <Eye size={16} strokeWidth={2} /> Pré-visualizar
      </button>
    </div>
  );

  return (
    <div>
      {/* breadcrumb + back */}
      <div className="page-header" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <button
          type="button"
          className="btn-back"
          onClick={handleBack}
          aria-label="Voltar"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Voltar
        </button>
      </div>

      <div className="assign-shell">
        {/* header */}
        <div className="assign-header">
          <p className="eyebrow" style={{ marginBottom: 4 }}>
            Treinador &rsaquo; Anamneses &rsaquo; {anamnesis?.title} &rsaquo; Vincular
          </p>
          <h1 style={{ fontFamily: 'var(--font-family-display)', fontSize: 18, fontWeight: 700, color: 'var(--brand-ink)', margin: 0 }}>
            Vincular Anamnese a Alunos
          </h1>
        </div>

        {/* mobile tabs */}
        <div className="assign-mobile-tabs">
          <button
            type="button"
            className={`assign-mobile-tab${mobileTab === 'students' ? ' assign-mobile-tab--active' : ''}`}
            onClick={() => setMobileTab('students')}
          >
            Alunos
          </button>
          <button
            type="button"
            className={`assign-mobile-tab${mobileTab === 'config' ? ' assign-mobile-tab--active' : ''}`}
            onClick={() => setMobileTab('config')}
          >
            Config.
          </button>
        </div>

        {/* body */}
        <div className="assign-body">
          <div className={`assign-students assign-panel${mobileTab === 'students' ? ' assign-panel--active' : ''}`}>
            {studentList}
          </div>
          <div className={`assign-panel${mobileTab === 'config' ? ' assign-panel--active' : ''}`}>
            {configPanel}
          </div>
        </div>

        {/* footer */}
        <div className="assign-footer">
          {selectedCount > 0 && (
            <span className="assign-counter">
              {selectedCount} {selectedCount === 1 ? 'aluno selecionado' : 'alunos selecionados'}
            </span>
          )}
          <span className="assign-footer-spacer" />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleBack}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={selectedCount === 0 || submitting}
            onClick={handleSubmit}
          >
            {submitting
              ? 'Vinculando...'
              : `Vincular a ${selectedCount} ${selectedCount === 1 ? 'aluno' : 'alunos'}`}
          </button>
        </div>
      </div>

      {previewOpen && anamnesis && (
        <AnamnesisPreviewModal
          anamnesis={anamnesis}
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
};

export default AssignAnamnesis;
