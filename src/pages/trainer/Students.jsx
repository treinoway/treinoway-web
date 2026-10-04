import { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Plus, CloudUpload, ArrowRight, Search, SearchX, ArrowUp, CircleAlert, Users } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { t, translateError, extractErrorInfo } from '../../i18n';
import api from '../../api/axios';
import { inviteStudent } from '../../api/studentInvites';
import { STUDENTS_PAGE_SIZE } from '../../constants/student';
import { StudentInviteOutcome, StudentInviteMessageCode } from '../../constants/studentInvite';
import StudentInvitesPanel from './StudentInvitesPanel';
import { formatRetryAfterDuration } from '../../utils/studentInvite';
import { getStudentDisplayName } from '../../utils/studentRow';
import { markOnboardingStepOptimistic } from '../../hooks/useOnboardingStatus';
import useStudentImport from '../../hooks/useStudentImport';
import Segmented from '../../components/ds/Segmented';
import EmptyBlock from '../../components/ds/EmptyBlock';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import StudentRow, { PLATFORM_BLOCKER } from '../../components/students/StudentRow';
import LinkStudentModal from '../../components/students/LinkStudentModal';
import ImportStudentsModal from '../../components/students/ImportStudentsModal';

const STUDENTS_TAB = 'students';
const INVITES_TAB = 'invites';
const VALID_STATUS_FILTERS = ['ativo', 'pendente', 'vencido'];
const STATUS_ORDER = { ativo: 0, pendente: 1, vencido: 2 };

const STATUS_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'ativo', label: 'Ativos' },
  { id: 'pendente', label: 'Pendentes' },
  { id: 'vencido', label: 'Atenção' },
];

const PAGE_TABS = [
  { id: STUDENTS_TAB, labelKey: 'studentInvites.tabStudents' },
  { id: INVITES_TAB, labelKey: 'studentInvites.tabInvites' },
];

const readInitialStatusFilter = (searchParams) => {
  const status = searchParams.get('status');
  return VALID_STATUS_FILTERS.includes(status) ? status : 'all';
};

const compareStudents = (sortBy) => (a, b) => {
  if (sortBy === 'status') return (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3);
  return (a.firstName || a.email || '').localeCompare(b.firstName || b.email || '');
};

// Daily invite limit (429) gets a wait time from details.retryAfterSeconds; everything else uses the translated message.
const getLinkErrorMessage = (error) => {
  const { messageCode, details } = extractErrorInfo(error);
  if (messageCode === StudentInviteMessageCode.DAILY_LIMIT && details?.retryAfterSeconds) {
    return t('studentInvites.dailyLimit').replace('{duration}', formatRetryAfterDuration(details.retryAfterSeconds));
  }
  return error.userMessage || translateError(error);
};

/* ─── Quota banner ──────────────────────────────────────────────────────── */
/* Surfaces the platform seat-quota problem once, at list level, with a single
   upgrade CTA — never per row. Shown only when ≥1 student is blocked_on_plan. */

const QuotaBanner = ({ count, onUpgrade }) => {
  const bodyKey = count === 1 ? 'students.quotaBanner.bodyOne' : 'students.quotaBanner.bodyOther';
  const body = (t(bodyKey) || '').replace('{count}', String(count));

  return (
    <div className="ds-banner" role="status">
      <span className="ds-banner__icon" aria-hidden="true">
        <ArrowUp size={20} strokeWidth={2} />
      </span>
      <div className="ds-banner__text">
        <strong className="type-body-strong">{t('students.quotaBanner.title')}</strong>
        <span className="type-body">{body}</span>
      </div>
      <button type="button" className="btn btn--primary" onClick={onUpgrade}>
        {t('students.quotaBanner.cta')}
      </button>
    </div>
  );
};

QuotaBanner.propTypes = {
  count: PropTypes.number.isRequired,
  onUpgrade: PropTypes.func.isRequired,
};

/* ─── Metrics ───────────────────────────────────────────────────────────── */

const Kpi = ({ label, value, support, tone }) => (
  <div className="kpi">
    <span className="kpi-label type-overline">{label}</span>
    <span className={`kpi-value students-metrics__value type-h2${tone ? ` kpi-value--${tone}` : ''}`}>{value}</span>
    <span className="kpi-support type-caption">{support}</span>
  </div>
);

Kpi.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  support: PropTypes.string.isRequired,
  tone: PropTypes.oneOf(['brand', 'warning', 'error']),
};

const StudentsMetrics = ({ counts }) => (
  <section className="section-card students-metrics-card" aria-label="Resumo de alunos">
    <div className="students-metrics">
      <Kpi label="Total" value={counts.all} support={`${counts.ativo} ativos`} />
      <Kpi label="Ativos" value={counts.ativo} support="com treinos vigentes" tone="brand" />
      <Kpi label="Pendentes" value={counts.pendente} support="aguardando anamnese" tone="warning" />
      <Kpi label="Atenção" value={counts.vencido} support="planos vencidos" tone="error" />
    </div>
  </section>
);

StudentsMetrics.propTypes = {
  counts: PropTypes.shape({
    all: PropTypes.number.isRequired,
    ativo: PropTypes.number.isRequired,
    pendente: PropTypes.number.isRequired,
    vencido: PropTypes.number.isRequired,
  }).isRequired,
};

/* ─── Toolbar ───────────────────────────────────────────────────────────── */

const StudentsToolbar = ({ search, onSearch, statusFilter, onStatusFilter, sortBy, onSortChange, counts }) => (
  <div className="students-bar section-card section-card--compact" role="search">
    <div className="input--search-wrap">
      <Search size={16} strokeWidth={2} aria-hidden="true" />
      <input
        type="text"
        className="input input--search input--on-elevated"
        placeholder="Buscar por nome ou e-mail"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        aria-label="Buscar alunos"
      />
    </div>
    <Segmented
      ariaLabel="Filtrar por status"
      items={STATUS_FILTERS.map((filter) => ({ ...filter, count: counts[filter.id] }))}
      value={statusFilter}
      onChange={onStatusFilter}
    />
    <select
      className="input students-bar__sort"
      value={sortBy}
      onChange={(e) => onSortChange(e.target.value)}
      aria-label="Ordenar alunos"
    >
      <option value="name">Nome A-Z</option>
      <option value="status">Status</option>
    </select>
  </div>
);

StudentsToolbar.propTypes = {
  search: PropTypes.string.isRequired,
  onSearch: PropTypes.func.isRequired,
  statusFilter: PropTypes.string.isRequired,
  onStatusFilter: PropTypes.func.isRequired,
  sortBy: PropTypes.string.isRequired,
  onSortChange: PropTypes.func.isRequired,
  counts: PropTypes.object.isRequired,
};

/* ─── Page tabs ─────────────────────────────────────────────────────────── */

const StudentsTabs = ({ activeTab, onChange }) => (
  <div className="students-tabs">
    <Segmented
      ariaLabel={t('studentInvites.tabsAria')}
      items={PAGE_TABS.map((tab) => ({
        id: tab.id,
        label: t(tab.labelKey),
        domId: `students-tab-${tab.id}`,
        controls: `students-tabpanel-${tab.id}`,
      }))}
      value={activeTab}
      onChange={onChange}
    />
  </div>
);

StudentsTabs.propTypes = {
  activeTab: PropTypes.oneOf([STUDENTS_TAB, INVITES_TAB]).isRequired,
  onChange: PropTypes.func.isRequired,
};

/* ─── Footer (count + incremental reveal) ───────────────────────────────── */

const StudentsFooter = ({ shown, total, onShowMore }) => (
  <div className="students-footer">
    <span className="students-footer__count type-caption" role="status">
      Mostrando {shown} de {total} {total === 1 ? 'aluno' : 'alunos'}
    </span>
    {shown < total && (
      <button type="button" className="btn btn--ghost" onClick={onShowMore}>
        Ver mais
        <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    )}
  </div>
);

StudentsFooter.propTypes = {
  shown: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  onShowMore: PropTypes.func.isRequired,
};

/* ─── Students list body ────────────────────────────────────────────────── */

const StudentsBody = ({ students, filtered, visibleCount, onShowMore, loadError, onRetry, onLink, onOpen, onUnlink, toolbar }) => {
  if (loadError && students.length === 0) {
    return (
      <EmptyBlock
        icon={CircleAlert}
        role="alert"
        title="Não foi possível carregar os alunos"
        description={loadError}
        actionLabel="Tentar novamente"
        onAction={onRetry}
      />
    );
  }
  if (students.length === 0) {
    return (
      <EmptyBlock
        icon={Users}
        title="Sem alunos ainda"
        description="Vincule seu primeiro aluno para começar a gerenciar treinos e acompanhar a evolução."
        actionLabel="Vincular primeiro aluno"
        onAction={onLink}
      />
    );
  }
  const visible = filtered.slice(0, visibleCount);
  return (
    <>
      {toolbar}
      {filtered.length === 0 ? (
        <EmptyBlock icon={SearchX} title="Sem resultados" description="Nenhum aluno corresponde aos filtros atuais." />
      ) : (
        <div className="students-list-ds">
          {visible.map((student) => (
            <StudentRow key={student.id} student={student} onOpen={onOpen} onUnlink={onUnlink} />
          ))}
        </div>
      )}
      {filtered.length > 0 && (
        <StudentsFooter shown={visible.length} total={filtered.length} onShowMore={onShowMore} />
      )}
    </>
  );
};

StudentsBody.propTypes = {
  students: PropTypes.array.isRequired,
  filtered: PropTypes.array.isRequired,
  visibleCount: PropTypes.number.isRequired,
  onShowMore: PropTypes.func.isRequired,
  loadError: PropTypes.string,
  onRetry: PropTypes.func.isRequired,
  onLink: PropTypes.func.isRequired,
  onOpen: PropTypes.func.isRequired,
  onUnlink: PropTypes.func.isRequired,
  toolbar: PropTypes.node,
};

/* ─── Students (page) ───────────────────────────────────────────────────── */

const Students = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => readInitialStatusFilter(searchParams));
  const [sortBy, setSortBy] = useState('name');
  const [visibleCount, setVisibleCount] = useState(STUDENTS_PAGE_SIZE);

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linking, setLinking] = useState(false);

  const [activeTab, setActiveTab] = useState(STUDENTS_TAB);
  const [invitesRefreshKey, setInvitesRefreshKey] = useState(0);

  const studentImport = useStudentImport(showToast);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await api.get('/trainer/students');
      setStudents(response.data);
    } catch (error) {
      const message = error.userMessage || translateError(error);
      setLoadError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

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
    const query = search.toLowerCase().trim();
    const matches = (student) => {
      if (statusFilter !== 'all' && student.status !== statusFilter) return false;
      if (!query) return true;
      const name = getStudentDisplayName(student).toLowerCase();
      return name.includes(query) || (student.email || '').toLowerCase().includes(query);
    };
    return students.filter(matches).sort(compareStudents(sortBy));
  }, [students, search, statusFilter, sortBy]);

  /* ── handlers — filters / paging (any change resets the reveal) ───────── */

  const resetVisibleCount = () => setVisibleCount(STUDENTS_PAGE_SIZE);

  const handleSearch = (value) => {
    setSearch(value);
    resetVisibleCount();
  };

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    resetVisibleCount();
  };

  const handleSortChange = (value) => {
    setSortBy(value);
    resetVisibleCount();
  };

  const handleShowMore = () => setVisibleCount((count) => count + STUDENTS_PAGE_SIZE);

  /* ── handlers — link ──────────────────────────────────────────────────── */

  const showInvitesTab = () => {
    setActiveTab(INVITES_TAB);
    setInvitesRefreshKey((key) => key + 1);
  };

  const handleStudentLinked = (student, wasFirstStudent) => {
    setStudents((prev) => [...prev, student]);
    showToast(t('studentInvites.linkedToast'), 'success');
    if (!wasFirstStudent) return;
    markOnboardingStepOptimistic('firstStudentLinked');
    navigate('/', { state: { justCompleted: 'firstStudent' } });
  };

  // Invited students are not in the roster yet: no append, no first-student onboarding.
  const handleInviteSent = (invite, emailValue) => {
    const email = invite?.email ?? emailValue;
    showToast(t('studentInvites.invitedToast').replace('{email}', email), 'success');
    showInvitesTab();
  };

  const handleLinkError = (error) => {
    showToast(getLinkErrorMessage(error), 'error');
    if (extractErrorInfo(error).messageCode !== StudentInviteMessageCode.ALREADY_PENDING) return;
    setShowLinkModal(false);
    showInvitesTab();
  };

  const handleLinkSubmit = async (emailValue) => {
    setLinking(true);
    const wasFirstStudent = students.length === 0;
    try {
      const result = await inviteStudent(emailValue);
      setShowLinkModal(false);
      if (result.outcome === StudentInviteOutcome.INVITED) {
        handleInviteSent(result.invite, emailValue);
      } else {
        handleStudentLinked(result.student, wasFirstStudent);
      }
    } catch (error) {
      handleLinkError(error);
    } finally {
      setLinking(false);
    }
  };

  /* ── handlers — unlink / open ─────────────────────────────────────────── */

  const handleUnlinkStudent = (student) => {
    const name = getStudentDisplayName(student);
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

  const handleOpenStudent = (student) => {
    navigate(`/trainer/students/${student.id}`, { state: { student } });
  };

  const handleOpenLinkModal = () => setShowLinkModal(true);

  /* ── render ───────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text type-body">Carregando...</span>
      </div>
    );
  }

  const toolbar = (
    <StudentsToolbar
      search={search}
      onSearch={handleSearch}
      statusFilter={statusFilter}
      onStatusFilter={handleStatusFilter}
      sortBy={sortBy}
      onSortChange={handleSortChange}
      counts={counts}
    />
  );

  return (
    <div>
      <header className="ds-page-header">
        <div className="ds-page-header__heading">
          <Users size={24} strokeWidth={2} aria-hidden="true" />
          <h1 className="ds-page-header__title type-h1">Meus alunos</h1>
        </div>
        <div className="ds-page-header__actions">
          <button type="button" className="btn btn--ghost" onClick={studentImport.open}>
            <CloudUpload size={16} strokeWidth={2} aria-hidden="true" />
            Importar alunos
          </button>
          {students.length > 0 && (
            <button type="button" className="btn btn--primary btn--lg" onClick={handleOpenLinkModal}>
              <Plus size={20} strokeWidth={2} aria-hidden="true" />
              Vincular aluno
            </button>
          )}
        </div>
      </header>

      <StudentsTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === INVITES_TAB ? (
        <div id={`students-tabpanel-${INVITES_TAB}`} role="tabpanel" aria-labelledby={`students-tab-${INVITES_TAB}`}>
          <StudentInvitesPanel refreshKey={invitesRefreshKey} />
        </div>
      ) : (
        <div id={`students-tabpanel-${STUDENTS_TAB}`} role="tabpanel" aria-labelledby={`students-tab-${STUDENTS_TAB}`}>
          {students.length > 0 && <StudentsMetrics counts={counts} />}
          {blockedByQuotaCount > 0 && (
            <QuotaBanner count={blockedByQuotaCount} onUpgrade={() => navigate('/profile')} />
          )}
          <StudentsBody
            students={students}
            filtered={filtered}
            visibleCount={visibleCount}
            onShowMore={handleShowMore}
            loadError={loadError}
            onRetry={fetchStudents}
            onLink={handleOpenLinkModal}
            onOpen={handleOpenStudent}
            onUnlink={handleUnlinkStudent}
            toolbar={toolbar}
          />
        </div>
      )}

      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          confirmLabel="Desvincular"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {showLinkModal && (
        <LinkStudentModal
          onClose={() => setShowLinkModal(false)}
          onSubmit={handleLinkSubmit}
          linking={linking}
        />
      )}

      {studentImport.isOpen && (
        <ImportStudentsModal
          onClose={studentImport.close}
          importStep={studentImport.step}
          onSelectPlatform={() => studentImport.selectStep('upload')}
          onGoBack={studentImport.goBack}
          importFile={studentImport.file}
          onFileChange={(e) => studentImport.selectFile(e.target.files[0] ?? null)}
          importLoading={studentImport.loading}
          onSubmitPreview={studentImport.submitPreview}
          importData={studentImport.data}
          selectedEmails={studentImport.selectedEmails}
          onToggleStudent={studentImport.toggleStudent}
          onToggleAll={studentImport.toggleAll}
          onSendInvites={studentImport.sendInvites}
        />
      )}
    </div>
  );
};

export default Students;
