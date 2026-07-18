import { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Users,
  Plus,
  Upload,
  Search,
  SearchX,
  Zap,
  Info,
  X,
  ChevronRight,
  Trash2,
  TriangleAlert,
  OctagonAlert,
  ClipboardList,
  CreditCard,
  XCircle,
  Clock,
  ArrowUpCircle,
  ArrowUp,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { t, translateError } from '../../i18n';
import api from '../../api/axios';
import { markOnboardingStepOptimistic } from '../../hooks/useOnboardingStatus';
import formatRelativeTime from '../../utils/relativeTime';
import noStudentsSvg from '../../assets/illustrations/no-students.svg';

/* ─── Avatar ────────────────────────────────────────────────────────────── */

const getAvatarColorIndex = (name) => {
  if (!name) return 0;
  const sum = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return Math.abs(sum) % 6;
};

const Avatar = ({ name, status, size }) => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase() || '?';

  const colorIdx = getAvatarColorIndex(name);

  const ringCls = status === 'ativo'
    ? 'avatar-ring'
    : status === 'pendente'
      ? 'avatar-ring avatar-ring--warn'
      : status === 'vencido'
        ? 'avatar-ring avatar-ring--danger'
        : '';

  const fontSize = Math.round(size * 0.38);

  return (
    <div className={ringCls} style={{ width: size, height: size, flexShrink: 0 }}>
      <div
        className={`avatar-initials avatar-color-${colorIdx}`}
        style={{ width: size, height: size, fontSize }}
        aria-hidden="true"
      >
        {initials}
      </div>
    </div>
  );
};

Avatar.propTypes = {
  name: PropTypes.string.isRequired,
  status: PropTypes.string,
  size: PropTypes.number,
};

Avatar.defaultProps = {
  size: 36,
  status: null,
};

/* ─── StatusBadge ───────────────────────────────────────────────────────── */

const StatusBadge = ({ status }) => {
  if (status === 'ativo') {
    return (
      <span className="badge badge-green">
        <span className="badge-dot" />
        Ativo
      </span>
    );
  }
  if (status === 'pendente') {
    return <span className="badge badge-blue">Pendente</span>;
  }
  if (status === 'vencido') {
    return <span className="badge badge-red">Vencido</span>;
  }
  return (
    <span className="badge badge-green">
      <span className="badge-dot" />
      Ativo
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.string,
};

StatusBadge.defaultProps = {
  status: 'ativo',
};

/* ─── Readiness ─────────────────────────────────────────────────────────── */
/* Renders the backend-supplied `blockersLabel[i]` (pre-translated pt-BR) as
   chips, keyed/ordered by `blockers[i]`. Icons map from the stable code; text
   is always the backend label — never re-translated in the frontend.
   `blocked_on_plan` is the trainer's seat-quota gate (blue "upgrade" chip);
   every other code is a student issue (amber "attention" chip). */

const PLATFORM_BLOCKER = 'blocked_on_plan';

const BLOCKER_ICON = {
  no_active_protocol: ClipboardList,
  no_subscription: CreditCard,
  subscription_cancelled: XCircle,
  subscription_overdue: Clock,
  blocked_on_plan: ArrowUpCircle,
};

const hasBlockers = (student) =>
  Array.isArray(student.blockers) && student.blockers.length > 0;

const getRowRailClass = (student) => {
  if (!hasBlockers(student)) return '';
  if (student.blockers.includes(PLATFORM_BLOCKER)) return ' student-stat-row--platform';
  return ' student-stat-row--needs-action';
};

const getRowAriaLabel = (student, fullName) => {
  if (!hasBlockers(student)) {
    return (t('students.viewProfileAria') || 'Ver perfil de {name}.').replace('{name}', fullName);
  }
  const labels = Array.isArray(student.blockersLabel) ? student.blockersLabel.filter(Boolean) : [];
  return (t('students.rowBlockersAria') || '{name} — {blockers}. Ver perfil.')
    .replace('{name}', fullName)
    .replace('{blockers}', labels.join(', '));
};

const ReadinessChips = ({ blockers, blockersLabel }) => (
  <div className="readiness-chips" aria-hidden="true">
    {blockers.map((code, index) => {
      const Icon = BLOCKER_ICON[code] || TriangleAlert;
      const variant = code === PLATFORM_BLOCKER ? 'platform' : 'blocker';
      const label = blockersLabel?.[index] || '';
      return (
        <span key={`${code}-${index}`} className={`readiness-chip readiness-chip--${variant}`}>
          <Icon size={13} strokeWidth={2} aria-hidden="true" />
          {label}
        </span>
      );
    })}
  </div>
);

ReadinessChips.propTypes = {
  blockers: PropTypes.arrayOf(PropTypes.string).isRequired,
  blockersLabel: PropTypes.arrayOf(PropTypes.string),
};

ReadinessChips.defaultProps = {
  blockersLabel: [],
};

/* ─── QuotaBanner ───────────────────────────────────────────────────────── */
/* Surfaces the platform seat-quota problem once, at list level, with a single
   upgrade CTA — never per row. Shown only when ≥1 student is blocked_on_plan. */

const QuotaBanner = ({ count, onUpgrade }) => {
  const bodyKey = count === 1 ? 'students.quotaBanner.bodyOne' : 'students.quotaBanner.bodyOther';
  const body = (t(bodyKey) || '').replace('{count}', String(count));

  return (
    <div className="quota-banner" role="status">
      <span className="quota-banner-icon" aria-hidden="true">
        <ArrowUp size={20} strokeWidth={2} />
      </span>
      <div className="quota-banner-text">
        <strong>{t('students.quotaBanner.title')}</strong>
        <span>{body}</span>
      </div>
      <button type="button" className="btn-primary" onClick={onUpgrade}>
        {t('students.quotaBanner.cta')}
      </button>
    </div>
  );
};

QuotaBanner.propTypes = {
  count: PropTypes.number.isRequired,
  onUpgrade: PropTypes.func.isRequired,
};

/* ─── StudentsStatsHero ─────────────────────────────────────────────────── */
/* Single rounded surface for the page's aggregate counters. Carries the
   page's one restrained geometric-cut accent (see .students-stats-hero::before
   in index.css) — the cut appears here only, never repeated per stat. */

const StudentsStatsHero = ({ students }) => {
  const total = students.length;
  const active = students.filter((s) => s.status === 'ativo').length;
  const pending = students.filter((s) => s.status === 'pendente').length;
  const overdue = students.filter((s) => s.status === 'vencido').length;

  return (
    <div className="students-stats-hero" aria-label="Resumo de alunos">
      <div className="students-stats-hero-grid">
        <div className="students-stats-hero-stat">
          <span className="students-stats-hero-stat-label">Total</span>
          <span className="students-stats-hero-stat-value">{total}</span>
          <span className="students-stats-hero-stat-sub">{active} ativos</span>
        </div>
        <div className="students-stats-hero-stat">
          <span className="students-stats-hero-stat-label">Ativos</span>
          <span className="students-stats-hero-stat-value students-stats-hero-stat-value--accent">{active}</span>
          <span className="students-stats-hero-stat-sub">com treinos vigentes</span>
        </div>
        <div className="students-stats-hero-stat">
          <span className="students-stats-hero-stat-label">Pendentes</span>
          <span className="students-stats-hero-stat-value students-stats-hero-stat-value--warn">{pending}</span>
          <span className="students-stats-hero-stat-sub">aguardando anamnese</span>
        </div>
        <div className="students-stats-hero-stat">
          <span className="students-stats-hero-stat-label">Atenção</span>
          <span className="students-stats-hero-stat-value students-stats-hero-stat-value--danger">{overdue}</span>
          <span className="students-stats-hero-stat-sub">planos vencidos</span>
        </div>
      </div>
    </div>
  );
};

StudentsStatsHero.propTypes = {
  students: PropTypes.array.isRequired,
};

/* ─── Toolbar ───────────────────────────────────────────────────────────── */

const Toolbar = ({ search, onSearch, statusFilter, onStatusFilter, sortBy, onSortChange, counts }) => (
  <div className="students-toolbar" role="search">
    <div className="students-search-wrap">
      <Search size={16} strokeWidth={2} aria-hidden="true" />
      <input
        type="text"
        className="students-search-input"
        placeholder="Buscar por nome ou e-mail…"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        aria-label="Buscar alunos"
      />
    </div>

    <div className="students-filter-group" role="tablist" aria-label="Filtrar por status">
      {[
        { id: 'all', label: 'Todos' },
        { id: 'ativo', label: 'Ativos' },
        { id: 'pendente', label: 'Pendentes' },
        { id: 'vencido', label: 'Atenção' },
      ].map((f) => (
        <button
          key={f.id}
          type="button"
          className={`students-filter-btn${statusFilter === f.id ? ' active' : ''}`}
          onClick={() => onStatusFilter(f.id)}
          role="tab"
          aria-selected={statusFilter === f.id}
        >
          {f.label}
          <span className="students-filter-count">{counts[f.id]}</span>
        </button>
      ))}
    </div>

    <select
      className="students-sort-select"
      value={sortBy}
      onChange={(e) => onSortChange(e.target.value)}
      aria-label="Ordenar alunos"
    >
      <option value="name">Nome A–Z</option>
      <option value="status">Status</option>
    </select>
  </div>
);

Toolbar.propTypes = {
  search: PropTypes.string.isRequired,
  onSearch: PropTypes.func.isRequired,
  statusFilter: PropTypes.string.isRequired,
  onStatusFilter: PropTypes.func.isRequired,
  sortBy: PropTypes.string.isRequired,
  onSortChange: PropTypes.func.isRequired,
  counts: PropTypes.shape({
    all: PropTypes.number.isRequired,
    ativo: PropTypes.number.isRequired,
    pendente: PropTypes.number.isRequired,
    vencido: PropTypes.number.isRequired,
  }).isRequired,
};

/* ─── Inline stat alert level ───────────────────────────────────────────── */

const DAY_MS = 1000 * 60 * 60 * 24;

const adherenceLevel = (adh) => {
  if (adh == null) return 'none';
  if (adh < 60) return 'danger';
  if (adh < 80) return 'warn';
  return 'ok';
};

const lastWorkoutLevel = (iso) => {
  if (!iso) return 'none';
  const days = (Date.now() - new Date(iso).getTime()) / DAY_MS;
  if (days > 14) return 'danger';
  if (days > 7) return 'warn';
  return 'ok';
};

// warn uses the effort-tier "on light" amber-safe text token — --brand-accent
// and --md-warning both fail WCAG AA as small text on a white surface.
const LEVEL_VALUE_CLASS = {
  ok: '',
  warn: 'student-stat-inline-value--warn',
  danger: 'student-stat-inline-value--danger',
  none: 'student-stat-inline-value--none',
};

const LEVEL_TITLE = {
  adherence: { warn: 'Aderência abaixo do ideal', danger: 'Aderência crítica' },
  lastWorkout: { warn: 'Sem treino há mais de 7 dias', danger: 'Sem treino há mais de 14 dias' },
};

const LevelIcon = ({ level }) => {
  if (level === 'warn') return <TriangleAlert size={13} strokeWidth={2.4} aria-hidden="true" />;
  if (level === 'danger') return <OctagonAlert size={13} strokeWidth={2.4} aria-hidden="true" />;
  return null;
};

LevelIcon.propTypes = { level: PropTypes.string.isRequired };

/* ─── StudentsStatsFirst ────────────────────────────────────────────────── */

const StudentsStatsFirst = ({ students, onUnlink, navigate }) => (
  <div className="students-list">
    {students.map((student) => {
      const fullName = [student.firstName, student.lastName].filter(Boolean).join(' ') || student.email;
      const status = student.status || 'ativo';

      return (
        <div
          key={student.id}
          className={`student-stat-row${getRowRailClass(student)}`}
          onClick={() => navigate(`/trainer/students/${student.id}`, { state: { student } })}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate(`/trainer/students/${student.id}`, { state: { student } });
            }
          }}
          aria-label={getRowAriaLabel(student, fullName)}
        >
          <div className="student-stat-row-identity">
            <Avatar name={fullName} status={status} size={40} />
            <div className="student-stat-row-info">
              <div className="student-stat-row-name">{fullName}</div>
              <div className="student-stat-row-meta">
                <StatusBadge status={status} />
                {student.email && (
                  <span>{student.email}</span>
                )}
              </div>
              {hasBlockers(student) && (
                <ReadinessChips blockers={student.blockers} blockersLabel={student.blockersLabel} />
              )}
            </div>
          </div>

          <div className="student-stat-row-stats">
            {(() => {
              const aLvl = adherenceLevel(student.adherence);
              const lwLvl = lastWorkoutLevel(student.lastWorkoutAt);
              const hasAdherenceCounts =
                student.adherenceCompleted != null && student.adherenceExpected != null;
              return (
                <>
                  <div
                    className="student-stat-inline"
                    title={LEVEL_TITLE.adherence[aLvl]}
                  >
                    <span className={`student-stat-inline-value ${LEVEL_VALUE_CLASS[aLvl]}`.trim()}>
                      <LevelIcon level={aLvl} />
                      {student.adherence == null ? '—' : `${Math.round(student.adherence)}%`}
                    </span>
                    {hasAdherenceCounts && (
                      <span className="student-stat-inline-sub">
                        {student.adherenceCompleted}/{student.adherenceExpected} treinos
                      </span>
                    )}
                    <span className="student-stat-inline-label">Aderência</span>
                  </div>
                  <div
                    className="student-stat-inline"
                    title={LEVEL_TITLE.lastWorkout[lwLvl]}
                  >
                    <span className={`student-stat-inline-value ${LEVEL_VALUE_CLASS[lwLvl]}`.trim()}>
                      <LevelIcon level={lwLvl} />
                      {formatRelativeTime(student.lastWorkoutAt) ?? '—'}
                    </span>
                    <span className="student-stat-inline-label">Último treino</span>
                  </div>
                </>
              );
            })()}
          </div>

          <button
            type="button"
            className="btn-ghost-danger"
            aria-label={`Desvincular ${fullName}`}
            onClick={(e) => { e.stopPropagation(); onUnlink(student); }}
          >
            <Trash2 size={16} strokeWidth={2} />
          </button>
        </div>
      );
    })}
  </div>
);

StudentsStatsFirst.propTypes = {
  students: PropTypes.array.isRequired,
  onUnlink: PropTypes.func.isRequired,
  navigate: PropTypes.func.isRequired,
};

/* ─── StudentsEmptyState ────────────────────────────────────────────────── */

const StudentsEmptyState = ({ onLink }) => (
  <div className="students-empty-state">
    <img src={noStudentsSvg} alt="" role="presentation" width="200" height="160" />
    <p className="students-empty-state-eyebrow">Sem alunos ainda</p>
    <p className="students-empty-state-desc">
      Vincule seu primeiro aluno para começar a gerenciar treinos e acompanhar a evolução.
    </p>
    <button type="button" className="btn-primary" onClick={onLink}>
      <Plus size={16} strokeWidth={2} />
      Vincular primeiro aluno
    </button>
  </div>
);

StudentsEmptyState.propTypes = {
  onLink: PropTypes.func.isRequired,
};

/* ─── NoResultsState ────────────────────────────────────────────────────── */

const NoResultsState = () => (
  <div className="students-no-results">
    <div className="students-no-results-icon">
      <SearchX size={28} strokeWidth={2} />
    </div>
    <p className="students-empty-state-eyebrow">Sem resultados</p>
    <p className="students-empty-state-desc">Nenhum aluno corresponde aos filtros atuais.</p>
  </div>
);

/* ─── StepIndicator ─────────────────────────────────────────────────────── */

const StepIndicator = ({ step }) => {
  const platformDone = step !== 'platform';
  const platformActive = step === 'platform';
  const uploadActive = step === 'upload';
  const uploadDone = step === 'preview';
  const previewActive = step === 'preview';

  const dotClass = (active, done) => {
    if (done) return 'students-step-dot students-step-dot--done';
    if (active) return 'students-step-dot students-step-dot--active';
    return 'students-step-dot';
  };

  return (
    <div className="students-step-indicator" aria-label="Progresso de importação">
      <span className={dotClass(platformActive, platformDone)} />
      <span>01 Plataforma</span>
      <span className="students-step-divider" />
      <span className={dotClass(uploadActive, uploadDone)} />
      <span>02 Arquivo</span>
      <span className="students-step-divider" />
      <span className={dotClass(previewActive, false)} />
      <span>03 Revisar</span>
    </div>
  );
};

StepIndicator.propTypes = {
  step: PropTypes.oneOf(['platform', 'upload', 'preview']).isRequired,
};

/* ─── LinkStudentModal ──────────────────────────────────────────────────── */

const LinkStudentModal = ({ onClose, onSubmit, linking }) => {
  const [email, setEmail] = useState('');

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    onSubmit(email.trim());
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="students-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="link-modal-title">
        <div className="students-modal-header">
          <h2 id="link-modal-title" className="students-modal-title">Vincular aluno</h2>
          <button
            type="button"
            className="students-modal-close"
            aria-label="Fechar modal"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="students-modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="link-student-email">
                E-mail do aluno
              </label>
              <input
                id="link-student-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="aluno@email.com"
                required
                autoFocus
                disabled={linking}
              />
              <span className="form-hint">O aluno receberá um convite por e-mail.</span>
            </div>
            <div className="btn-group btn-group--equal mt-lg">
              <button
                type="submit"
                className="btn-primary"
                disabled={linking || !email.trim()}
              >
                {linking ? 'Vinculando…' : 'Vincular'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={linking}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

LinkStudentModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  linking: PropTypes.bool.isRequired,
};

/* ─── ImportPreviewTable ────────────────────────────────────────────────── */

const ImportPreviewTable = ({ students, selectedEmails, onToggleStudent, onToggleAll }) => {
  const selectableStudents = students.filter((s) => !s.duplicateEmail && s.email);
  const allSelected = selectableStudents.length > 0 && selectableStudents.every((s) => selectedEmails.has(s.email));

  return (
    <div className="students-import-table-wrap">
      <table className="students-t-import">
        <thead>
          <tr>
            <th className="students-t-import-checkbox-col">
              <input
                type="checkbox"
                aria-label="Selecionar todos"
                checked={allSelected}
                onChange={onToggleAll}
              />
            </th>
            <th>Nome</th>
            <th className="table-col-desktop-only">E-mail</th>
            <th className="table-col-desktop-only">Plano</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student, i) => (
            <tr key={student.email || i}>
              <td>
                <input
                  type="checkbox"
                  aria-label={`Selecionar ${student.fullName || student.email}`}
                  checked={!!student.email && selectedEmails.has(student.email)}
                  onChange={() => onToggleStudent(student.email)}
                  disabled={student.duplicateEmail || !student.email}
                />
              </td>
              <td className="font-medium">
                {student.fullName}
                <span className="table-col-mobile-only text-sm text-muted students-import-name-email">
                  {student.email || '—'}
                </span>
              </td>
              <td className="table-col-desktop-only text-steel">
                {student.email || '—'}
              </td>
              <td className="table-col-desktop-only">{student.plan || '—'}</td>
              <td>
                {student.duplicateEmail ? (
                  <span className="badge badge-red">Duplicado</span>
                ) : student.status === 'ATIVO' || student.status === 'Entregue' ? (
                  <span className="badge badge-green">
                    <span className="badge-dot" />
                    Ativo
                  </span>
                ) : (
                  <span className="badge badge-blue">Pendente</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

ImportPreviewTable.propTypes = {
  students: PropTypes.arrayOf(
    PropTypes.shape({
      fullName: PropTypes.string,
      email: PropTypes.string,
      plan: PropTypes.string,
      status: PropTypes.string,
      duplicateEmail: PropTypes.bool,
    })
  ).isRequired,
  selectedEmails: PropTypes.instanceOf(Set).isRequired,
  onToggleStudent: PropTypes.func.isRequired,
  onToggleAll: PropTypes.func.isRequired,
};

/* ─── ImportStudentsModal ───────────────────────────────────────────────── */

const IMPORT_MODAL_TITLES = {
  platform: 'Importar alunos',
  upload: 'Importar do PrimeCoaching',
  preview: 'Alunos do PrimeCoaching',
};

const ImportStudentsModal = ({
  onClose,
  importStep,
  onSelectPlatform,
  onGoBack,
  importFile,
  onFileChange,
  importLoading,
  onSubmitPreview,
  importData,
  selectedEmails,
  onToggleStudent,
  onToggleAll,
  onSendInvites,
}) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const isLarge = importStep === 'preview';

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className={`students-modal${isLarge ? ' students-modal--large' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
      >
        <div className="students-modal-header">
          <h2 id="import-modal-title" className="students-modal-title">
            {IMPORT_MODAL_TITLES[importStep]}
          </h2>
          <button
            type="button"
            className="students-modal-close"
            aria-label="Fechar modal"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="students-modal-body">
          <StepIndicator step={importStep} />

          {importStep === 'platform' && (
            <>
              <p className="form-hint mb-md">
                Selecione a plataforma de origem.
              </p>
              <button
                type="button"
                className="students-import-platform-card"
                onClick={onSelectPlatform}
              >
                <span className="students-import-platform-icon">
                  <Zap size={22} strokeWidth={2} />
                </span>
                <span>
                  <span className="students-import-platform-name">PrimeCoaching</span>
                  <span className="students-import-platform-desc">
                    Importar alunos da sua conta PrimeCoaching
                  </span>
                </span>
                <ChevronRight size={18} strokeWidth={2} className="students-import-platform-chevron" />
              </button>
            </>
          )}

          {importStep === 'upload' && (
            <form onSubmit={onSubmitPreview}>
              <div className="students-import-notice">
                <Info size={16} strokeWidth={2} />
                <span>
                  Acesse o PrimeCoaching, exporte a lista de alunos em formato XLSX e faça o upload
                  do arquivo abaixo.
                </span>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="import-file">
                  Arquivo XLSX do PrimeCoaching
                </label>
                <input
                  id="import-file"
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={onFileChange}
                  className="form-input"
                  required
                  disabled={importLoading}
                />
              </div>
              <div className="btn-group btn-group--equal mt-md">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={importLoading || !importFile}
                >
                  {importLoading ? 'Processando…' : 'Continuar'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onGoBack}
                  disabled={importLoading}
                >
                  Voltar
                </button>
              </div>
            </form>
          )}

          {importStep === 'preview' && importData && (
            <>
              <div className="students-import-summary" role="status">
                <Users size={16} strokeWidth={2} />
                <span>
                  <strong>{importData.summary.total}</strong>{' '}
                  {importData.summary.total === 1 ? 'aluno encontrado' : 'alunos encontrados'}
                </span>
                <span className="text-steel">·</span>
                <span className="text-steel">
                  <strong>{importData.summary.duplicateEmails}</strong>{' '}
                  {importData.summary.duplicateEmails === 1 ? 'duplicado' : 'duplicados'}
                </span>
                <span className="students-import-summary-right">
                  <strong>{selectedEmails.size}</strong> selecionados
                </span>
              </div>

              <ImportPreviewTable
                students={importData.students}
                selectedEmails={selectedEmails}
                onToggleStudent={onToggleStudent}
                onToggleAll={onToggleAll}
              />

              <div className="btn-group btn-group--equal mt-md">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={selectedEmails.size === 0}
                  onClick={onSendInvites}
                >
                  Enviar {selectedEmails.size} convite{selectedEmails.size !== 1 ? 's' : ''}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onGoBack}
                >
                  Voltar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

ImportStudentsModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  importStep: PropTypes.oneOf(['platform', 'upload', 'preview']).isRequired,
  onSelectPlatform: PropTypes.func.isRequired,
  onGoBack: PropTypes.func.isRequired,
  importFile: PropTypes.object,
  onFileChange: PropTypes.func.isRequired,
  importLoading: PropTypes.bool.isRequired,
  onSubmitPreview: PropTypes.func.isRequired,
  importData: PropTypes.shape({
    students: PropTypes.array.isRequired,
    summary: PropTypes.shape({
      total: PropTypes.number.isRequired,
      duplicateEmails: PropTypes.number.isRequired,
    }).isRequired,
  }),
  selectedEmails: PropTypes.instanceOf(Set).isRequired,
  onToggleStudent: PropTypes.func.isRequired,
  onToggleAll: PropTypes.func.isRequired,
  onSendInvites: PropTypes.func.isRequired,
};

ImportStudentsModal.defaultProps = {
  importFile: null,
  importData: null,
};

/* ─── Students (page) ───────────────────────────────────────────────────── */

const getStudentName = (student) => {
  const name = [student.firstName, student.lastName].filter(Boolean).join(' ');
  return name || null;
};

const VALID_STATUS_FILTERS = ['ativo', 'pendente', 'vencido'];

const readInitialStatusFilter = (searchParams) => {
  const status = searchParams.get('status');
  return VALID_STATUS_FILTERS.includes(status) ? status : 'all';
};

const Students = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => readInitialStatusFilter(searchParams));
  const [sortBy, setSortBy] = useState('name');

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linking, setLinking] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState('platform');
  const [importLoading, setImportLoading] = useState(false);
  const [importData, setImportData] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [selectedEmails, setSelectedEmails] = useState(new Set());

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/trainer/students');
      setStudents(response.data);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  /* ── computed ─────────────────────────────────────────────────────────── */

  const counts = useMemo(() => ({
    all: students.length,
    ativo: students.filter((s) => s.status === 'ativo').length,
    pendente: students.filter((s) => s.status === 'pendente').length,
    vencido: students.filter((s) => s.status === 'vencido').length,
  }), [students]);

  const blockedByQuotaCount = useMemo(
    () => students.filter((s) => Array.isArray(s.blockers) && s.blockers.includes(PLATFORM_BLOCKER)).length,
    [students]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = students.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (q) {
        const name = getStudentName(s) || '';
        return name.toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === 'name') {
        return (a.firstName || a.email || '').localeCompare(b.firstName || b.email || '');
      }
      if (sortBy === 'status') {
        const order = { ativo: 0, pendente: 1, vencido: 2 };
        return (order[a.status] ?? 3) - (order[b.status] ?? 3);
      }
      return 0;
    });
    return list;
  }, [students, search, statusFilter, sortBy]);

  /* ── handlers — link ──────────────────────────────────────────────────── */

  const handleLinkSubmit = async (emailValue) => {
    setLinking(true);
    const wasFirstStudent = students.length === 0;
    try {
      const response = await api.post('/trainer/students', { email: emailValue });
      setStudents((prev) => [...prev, response.data]);
      showToast('Aluno vinculado com sucesso!', 'success');
      setShowLinkModal(false);
      if (wasFirstStudent) {
        markOnboardingStepOptimistic('firstStudentLinked');
        navigate('/', { state: { justCompleted: 'firstStudent' } });
      }
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLinking(false);
    }
  };

  /* ── handlers — unlink ────────────────────────────────────────────────── */

  const handleUnlinkStudent = (student) => {
    const name = getStudentName(student) || student.email;
    setConfirmDialog({
      message: `Desvincular ${name}? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/students/${student.id}`);
          setStudents((prev) => prev.filter((s) => s.id !== student.id));
          showToast('Aluno desvinculado.', 'success');
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  /* ── handlers — import ────────────────────────────────────────────────── */

  const handleCloseImportModal = () => {
    setShowImportModal(false);
    setImportStep('platform');
    setImportLoading(false);
    setImportData(null);
    setImportFile(null);
    setSelectedEmails(new Set());
  };

  const handleImportPreview = async (e) => {
    e.preventDefault();
    if (!importFile) return;
    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const response = await api.post('/trainer/import/primecoaching/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportData(response.data);
      setSelectedEmails(
        new Set(response.data.students.filter((s) => !s.duplicateEmail && s.email).map((s) => s.email))
      );
      setImportStep('preview');
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setImportLoading(false);
    }
  };

  const handleToggleStudent = (email) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const handleToggleAll = () => {
    const all = (importData?.students || [])
      .filter((s) => !s.duplicateEmail && s.email)
      .map((s) => s.email);
    const anySelected = all.some((e) => selectedEmails.has(e));
    setSelectedEmails(anySelected ? new Set() : new Set(all));
  };

  const handleSendInvites = () => {
    const n = selectedEmails.size;
    showToast(`${n} convite${n !== 1 ? 's' : ''} enviado${n !== 1 ? 's' : ''}.`, 'success');
    handleCloseImportModal();
  };

  /* ── render ───────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-header-title-row">
            <Users size={24} strokeWidth={2} className="page-header-title-icon" />
            <h1>Meus Alunos</h1>
          </div>
        </div>
        <div className="page-header-actions page-header-actions--equal-mobile">
          <button
            type="button"
            className="btn-secondary"
            aria-label="Importar alunos"
            onClick={() => setShowImportModal(true)}
          >
            <Upload size={16} strokeWidth={2} />
            Importar<span className="btn-label-suffix"> alunos</span>
          </button>
          {students.length > 0 && (
            <button
              type="button"
              className="btn-primary"
              aria-label="Vincular aluno"
              onClick={() => setShowLinkModal(true)}
            >
              <Plus size={16} strokeWidth={2} />
              Vincular<span className="btn-label-suffix"> aluno</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats hero — only when students exist */}
      {students.length > 0 && <StudentsStatsHero students={students} />}

      {/* Quota banner — surfaces the seat-quota problem once, at list level */}
      {blockedByQuotaCount > 0 && (
        <QuotaBanner count={blockedByQuotaCount} onUpgrade={() => navigate('/profile')} />
      )}

      {/* Empty state */}
      {students.length === 0 ? (
        <StudentsEmptyState onLink={() => setShowLinkModal(true)} />
      ) : (
        <>
          <Toolbar
            search={search}
            onSearch={setSearch}
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
            counts={counts}
          />

          {filtered.length === 0 ? (
            <NoResultsState />
          ) : (
            <StudentsStatsFirst
              students={filtered}
              onUnlink={handleUnlinkStudent}
              navigate={navigate}
            />
          )}
        </>
      )}

      {/* Confirm dialog — unlink */}
      {confirmDialog && (
        <div className="overlay" onClick={() => setConfirmDialog(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="btn-group btn-group--equal">
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="btn-danger"
              >
                Desvincular
              </button>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link student modal */}
      {showLinkModal && (
        <LinkStudentModal
          onClose={() => setShowLinkModal(false)}
          onSubmit={handleLinkSubmit}
          linking={linking}
        />
      )}

      {/* Import modal */}
      {showImportModal && (
        <ImportStudentsModal
          onClose={handleCloseImportModal}
          importStep={importStep}
          onSelectPlatform={() => setImportStep('upload')}
          onGoBack={() => setImportStep(importStep === 'preview' ? 'upload' : 'platform')}
          importFile={importFile}
          onFileChange={(e) => setImportFile(e.target.files[0] ?? null)}
          importLoading={importLoading}
          onSubmitPreview={handleImportPreview}
          importData={importData}
          selectedEmails={selectedEmails}
          onToggleStudent={handleToggleStudent}
          onToggleAll={handleToggleAll}
          onSendInvites={handleSendInvites}
        />
      )}
    </div>
  );
};

export default Students;
