import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Users, Search, Pencil } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { t, tf, translateError } from '../../i18n';
import { listTrainers, changeTrainerPlan } from '../../api/admin';
import { PLATFORM_PLAN_TIERS, isTierDowngrade } from '../../constants/platformPlan';
import useAdminQuery from '../../hooks/useAdminQuery';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import useResettablePage from '../../hooks/useResettablePage';
import LibraryPageHeader from '../../components/LibraryPageHeader';
import Select from '../../components/Select';
import Badge from '../../components/ds/Badge';
import Banner from '../../components/ds/Banner';
import EmptyBlock from '../../components/ds/EmptyBlock';
import Modal from '../../components/ds/Modal';
import QueryFeedback from '../../components/admin/QueryFeedback';
import AdminPagination from '../../components/admin/AdminPagination';
import TierBadge from '../../components/admin/TierBadge';
import {
  getTrainerName,
  hasTrainerName,
  isAbnormalStatus,
  getStatusTone,
  getStatusLabelKey,
} from '../../utils/adminTrainer';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

// Returns the "active / cap" students label, "Ilimitado" when the plan has no cap.
const getStudentsLabel = ({ activeStudents, studentCap }) =>
  `${activeStudents} / ${studentCap ?? t('adminTrainers.unlimited')}`;

// Badge for a non-ACTIVE subscription status (warning, or error when canceled).
const StatusBadge = ({ status }) => {
  const labelKey = getStatusLabelKey(status);
  return <Badge tone={getStatusTone(status)}>{labelKey ? t(labelKey) : status}</Badge>;
};

StatusBadge.propTypes = { status: PropTypes.string.isRequired };

// Warnings shown in the change dialog: Asaas overwrite and over-cap students blocked.
const PlanWarnings = ({ trainer, nextTier }) => (
  <>
    {trainer.hasAsaasSubscription && <Banner tone="warning">{t('adminTrainers.asaasWarning')}</Banner>}
    {isTierDowngrade(trainer.tier, nextTier) && <Banner tone="warning">{t('adminTrainers.downgradeWarning')}</Banner>}
  </>
);

PlanWarnings.propTypes = {
  trainer: PropTypes.shape({ tier: PropTypes.string, hasAsaasSubscription: PropTypes.bool }).isRequired,
  nextTier: PropTypes.string.isRequired,
};

// Modal to pick a new plan for one trainer; the page owns the request.
const ChangePlanModal = ({ trainer, saving, onSave, onClose }) => {
  const [tier, setTier] = useState(trainer.tier);
  const handleClose = () => {
    if (!saving) onClose();
  };
  const footer = (
    <>
      <button type="button" className="btn btn--secondary" onClick={handleClose} disabled={saving}>
        {t('adminTrainers.cancel')}
      </button>
      <button
        type="button"
        className="btn btn--primary"
        onClick={() => onSave(tier)}
        disabled={saving || tier === trainer.tier}
      >
        {saving ? t('adminTrainers.saving') : t('adminTrainers.confirm')}
      </button>
    </>
  );

  return (
    <Modal title={t('adminTrainers.modalTitle')} onClose={handleClose} closeDisabled={saving} footer={footer}>
      <div className="admin-modal-body">
        <p className="type-body">{tf('adminTrainers.modalDescription', { name: getTrainerName(trainer) })}</p>
        <div className="field">
          <label className="field-label type-caption-strong" htmlFor="trainer-plan-tier">
            {t('adminTrainers.planLabel')}
          </label>
          <Select id="trainer-plan-tier" value={tier} onChange={(event) => setTier(event.target.value)} disabled={saving}>
            {PLATFORM_PLAN_TIERS.map((value) => (
              <option key={value} value={value}>{t(`platformPlan.tier.${value}`)}</option>
            ))}
          </Select>
        </div>
        <PlanWarnings trainer={trainer} nextTier={tier} />
      </div>
    </Modal>
  );
};

ChangePlanModal.propTypes = {
  trainer: PropTypes.object.isRequired,
  saving: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

// One trainer row: identity, plan badge, student usage and the single change-plan action.
const TrainerRow = ({ trainer, onChangePlan }) => {
  const name = getTrainerName(trainer);
  const showEmail = hasTrainerName(trainer) && Boolean(trainer.email);
  return (
    <tr>
      <td>
        <span className="type-body-strong">{name}</span>
        {showEmail && <span className="admin-table__sub type-caption">{trainer.email}</span>}
      </td>
      <td>
        <TierBadge tier={trainer.tier} />
        {isAbnormalStatus(trainer.subscriptionStatus) && <StatusBadge status={trainer.subscriptionStatus} />}
      </td>
      <td className="admin-table__number">{getStudentsLabel(trainer)}</td>
      <td className="admin-table__actions">
        <button
          type="button"
          className="icon-button"
          aria-label={tf('adminTrainers.changePlanFor', { name })}
          title={t('adminTrainers.modalTitle')}
          onClick={() => onChangePlan(trainer)}
        >
          <Pencil size={20} strokeWidth={2} aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
};

TrainerRow.propTypes = {
  trainer: PropTypes.object.isRequired,
  onChangePlan: PropTypes.func.isRequired,
};

// Responsive trainers table (plan and students stay visible at 375px).
const TrainersTable = ({ trainers, busy, onChangePlan }) => (
  <div className="section-card admin-table-wrap" aria-busy={busy}>
    <table className="admin-table type-body">
      <thead>
        <tr>
          <th className="type-caption-strong">{t('adminTrainers.colTrainer')}</th>
          <th className="type-caption-strong">{t('adminTrainers.colPlan')}</th>
          <th className="type-caption-strong">{t('adminTrainers.colStudents')}</th>
          <th aria-label={t('adminTrainers.colActions')} />
        </tr>
      </thead>
      <tbody>
        {trainers.map((trainer) => (
          <TrainerRow key={trainer.trainerId} trainer={trainer} onChangePlan={onChangePlan} />
        ))}
      </tbody>
    </table>
  </div>
);

TrainersTable.propTypes = {
  trainers: PropTypes.array.isRequired,
  busy: PropTypes.bool.isRequired,
  onChangePlan: PropTypes.func.isRequired,
};

// Search box that filters trainers by name or email.
const TrainerSearch = ({ value, onChange }) => (
  <div className="field admin-search">
    <label className="field-label type-caption-strong" htmlFor="trainers-search">
      {t('adminTrainers.searchLabel')}
    </label>
    <div className="input--search-wrap">
      <Search size={16} strokeWidth={2} aria-hidden="true" />
      <input
        id="trainers-search"
        type="text"
        className="input input--search"
        placeholder={t('adminTrainers.searchPlaceholder')}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  </div>
);

TrainerSearch.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

// Applies a PATCH response to the matching trainer in the loaded page.
const applyPlanChange = (result) => (data) => ({
  ...data,
  items: data.items.map((item) =>
    item.trainerId === result.trainerId
      ? {
          ...item,
          tier: result.tier,
          subscriptionStatus: result.subscriptionStatus,
          hasAsaasSubscription: result.hasAsaasSubscription,
          activeStudents: result.activeStudents,
          studentCap: result.studentCap,
        }
      : item
  ),
});

// Admin page: search trainers and change each one's platform plan.
const TrainersList = () => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const [page, setPage] = useResettablePage(debouncedSearch);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const params = useMemo(
    () => ({ search: debouncedSearch || undefined, page, pageSize: PAGE_SIZE }),
    [debouncedSearch, page]
  );
  const { data, staleData, loading, error, reload, setData } = useAdminQuery(listTrainers, params);

  const handleSavePlan = async (tier) => {
    setSaving(true);
    try {
      const result = await changeTrainerPlan(editing.trainerId, tier);
      setData(applyPlanChange(result));
      setEditing(null);
      showToast(t('adminTrainers.changeSuccess'), 'success');
    } catch (saveError) {
      showToast(saveError.userMessage || translateError(saveError), 'error');
    } finally {
      setSaving(false);
    }
  };

  const shown = data ?? staleData;
  const trainers = shown?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((shown?.total ?? 0) / PAGE_SIZE));
  const hasRows = trainers.length > 0;
  const isEmpty = !loading && !error && !hasRows;

  return (
    <div className="admin-page">
      <LibraryPageHeader icon={Users} title={t('adminTrainers.title')} />
      <TrainerSearch value={search} onChange={setSearch} />
      <QueryFeedback
        loading={loading && !hasRows}
        error={error}
        loadingLabel={t('adminTrainers.loading')}
        errorTitle={t('adminTrainers.errorTitle')}
        retryLabel={t('adminTrainers.retry')}
        onRetry={reload}
      />
      {isEmpty && (
        <EmptyBlock icon={Users} title={t('adminTrainers.emptyTitle')} description={t('adminTrainers.emptyDescription')} />
      )}
      {!error && hasRows && (
        <>
          <TrainersTable trainers={trainers} busy={loading} onChangePlan={setEditing} />
          <AdminPagination page={page} pageCount={pageCount} onPageChange={setPage} i18nPrefix="adminTrainers" />
        </>
      )}
      {editing && (
        <ChangePlanModal trainer={editing} saving={saving} onSave={handleSavePlan} onClose={() => setEditing(null)} />
      )}
    </div>
  );
};

export default TrainersList;
