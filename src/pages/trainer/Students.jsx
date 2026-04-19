import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  MoreVertical,
  ClipboardList,
  UserCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import { markOnboardingStepOptimistic } from '../../hooks/useOnboardingStatus';
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
      <span className="student-badge student-badge--green">
        <span className="student-badge-dot" />
        Ativo
      </span>
    );
  }
  if (status === 'pendente') {
    return <span className="student-badge student-badge--blue">Pendente</span>;
  }
  if (status === 'vencido') {
    return <span className="student-badge student-badge--red">Vencido</span>;
  }
  return <span className="student-badge">Ativo</span>;
};

StatusBadge.propTypes = {
  status: PropTypes.string,
};

StatusBadge.defaultProps = {
  status: 'ativo',
};

/* ─── StudentRowMenu ────────────────────────────────────────────────────── */

const StudentRowMenu = ({ student, onUnlink, navigate }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleView = () => {
    setOpen(false);
    navigate(`/trainer/students/${student.id}`, { state: { student } });
  };

  const handleCreateRoutine = () => {
    setOpen(false);
    navigate(`/trainer/protocols/new?studentId=${student.id}`);
  };

  const handleUnlink = () => {
    setOpen(false);
    onUnlink(student);
  };

  return (
    <div className="row-menu" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="row-menu-trigger"
        aria-label={`Ações de ${student.firstName || student.email}`}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <MoreVertical size={18} strokeWidth={2} />
      </button>
      {open && (
        <div className="row-menu-dropdown" role="menu">
          <button
            type="button"
            className="row-menu-item"
            role="menuitem"
            onClick={handleView}
          >
            <UserCircle size={15} strokeWidth={2} />
            Ver perfil
          </button>
          <button
            type="button"
            className="row-menu-item"
            role="menuitem"
            onClick={handleCreateRoutine}
          >
            <ClipboardList size={15} strokeWidth={2} />
            Criar rotina
          </button>
          <div className="row-menu-divider" />
          <button
            type="button"
            className="row-menu-item row-menu-item--danger"
            role="menuitem"
            onClick={handleUnlink}
          >
            Desvincular
          </button>
        </div>
      )}
    </div>
  );
};

StudentRowMenu.propTypes = {
  student: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    email: PropTypes.string,
  }).isRequired,
  onUnlink: PropTypes.func.isRequired,
  navigate: PropTypes.func.isRequired,
};

/* ─── StatsHeader ───────────────────────────────────────────────────────── */

const StatsHeader = ({ students }) => {
  const total = students.length;
  const active = students.filter((s) => s.status === 'ativo').length;
  const pending = students.filter((s) => s.status === 'pendente').length;
  const overdue = students.filter((s) => s.status === 'vencido').length;

  return (
    <div className="students-stats-row" aria-label="Resumo de alunos">
      <div className="students-stat-card">
        <span className="students-stat-card-label">Total</span>
        <span className="students-stat-card-value">{total}</span>
        <span className="students-stat-card-sub">{active} ativos</span>
      </div>
      <div className="students-stat-card">
        <span className="students-stat-card-label">Ativos</span>
        <span className="students-stat-card-value students-stat-card-value--accent">{active}</span>
        <span className="students-stat-card-sub">com treinos vigentes</span>
      </div>
      <div className="students-stat-card">
        <span className="students-stat-card-label">Pendentes</span>
        <span className="students-stat-card-value students-stat-card-value--warn">{pending}</span>
        <span className="students-stat-card-sub">aguardando anamnese</span>
      </div>
      <div className="students-stat-card">
        <span className="students-stat-card-label">Atenção</span>
        <span className="students-stat-card-value students-stat-card-value--danger">{overdue}</span>
        <span className="students-stat-card-sub">planos vencidos</span>
      </div>
    </div>
  );
};

StatsHeader.propTypes = {
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

/* ─── StudentsStatsFirst ────────────────────────────────────────────────── */

const StudentsStatsFirst = ({ students, onUnlink, navigate }) => (
  <div className="students-list">
    {students.map((student) => {
      const fullName = [student.firstName, student.lastName].filter(Boolean).join(' ') || student.email;
      const status = student.status || 'ativo';

      return (
        <div
          key={student.id}
          className="student-stat-row"
          onClick={() => navigate(`/trainer/students/${student.id}`, { state: { student } })}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate(`/trainer/students/${student.id}`, { state: { student } });
            }
          }}
          aria-label={`Ver perfil de ${fullName}`}
        >
          <div className="student-stat-row-identity">
            <Avatar name={fullName} status={status} size={40} />
            <div style={{ minWidth: 0 }}>
              <div className="student-stat-row-name">{fullName}</div>
              <div className="student-stat-row-meta">
                <StatusBadge status={status} />
                {student.email && (
                  <span>{student.email}</span>
                )}
              </div>
            </div>
          </div>

          <div className="student-stat-row-stats" aria-hidden="true">
            <div className="student-stat-inline">
              <span className="student-stat-inline-value" style={{ color: 'var(--brand-steel)' }}>—</span>
              <span className="student-stat-inline-label">Aderência</span>
            </div>
            <div className="student-stat-inline">
              <span className="student-stat-inline-value" style={{ color: 'var(--brand-steel)' }}>—</span>
              <span className="student-stat-inline-label">Último acesso</span>
            </div>
            <div className="student-stat-inline">
              <span className="student-stat-inline-value" style={{ color: 'var(--brand-steel)' }}>—</span>
              <span className="student-stat-inline-label">Sem PR</span>
            </div>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <StudentRowMenu student={student} onUnlink={onUnlink} navigate={navigate} />
          </div>
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
            <div className="btn-group" style={{ marginTop: 'var(--spacing-lg)' }}>
              <button
                type="submit"
                className="btn-primary"
                style={{ flex: 1 }}
                disabled={linking || !email.trim()}
              >
                {linking ? 'Vinculando…' : 'Vincular'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1 }}
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
            <th style={{ width: 36 }}>
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
              <td className="table-col-desktop-only" style={{ color: 'var(--brand-steel)' }}>
                {student.email || '—'}
              </td>
              <td className="table-col-desktop-only">{student.plan || '—'}</td>
              <td>
                {student.duplicateEmail ? (
                  <span className="student-badge student-badge--red">Duplicado</span>
                ) : student.status === 'ATIVO' || student.status === 'Entregue' ? (
                  <span className="student-badge student-badge--green">
                    <span className="student-badge-dot" />
                    Ativo
                  </span>
                ) : (
                  <span className="student-badge student-badge--blue">Pendente</span>
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
              <p className="form-hint" style={{ marginBottom: 'var(--spacing-md)' }}>
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
              <div className="btn-group" style={{ marginTop: 'var(--spacing-md)' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1 }}
                  disabled={importLoading || !importFile}
                >
                  {importLoading ? 'Processando…' : 'Continuar'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1 }}
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
                <span style={{ color: 'var(--brand-steel)' }}>·</span>
                <span style={{ color: 'var(--brand-steel)' }}>
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

              <div className="btn-group" style={{ marginTop: 'var(--spacing-md)' }}>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ flex: 1 }}
                  disabled={selectedEmails.size === 0}
                  onClick={onSendInvites}
                >
                  Enviar {selectedEmails.size} convite{selectedEmails.size !== 1 ? 's' : ''}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1 }}
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

const Students = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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
        <div className="page-header-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowImportModal(true)}
          >
            <Upload size={16} strokeWidth={2} />
            Importar alunos
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowLinkModal(true)}
          >
            <Plus size={16} strokeWidth={2} />
            Vincular aluno
          </button>
        </div>
      </div>

      {/* Stats row — only when students exist */}
      {students.length > 0 && <StatsHeader students={students} />}

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
            <div className="btn-group">
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="btn-danger"
                style={{ flex: 1 }}
              >
                Desvincular
              </button>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="btn-secondary"
                style={{ flex: 1 }}
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
