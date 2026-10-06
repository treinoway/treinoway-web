import PropTypes from 'prop-types';
import { Search, SearchX } from 'lucide-react';
import Segmented from '../ds/Segmented';
import EmptyBlock from '../ds/EmptyBlock';
import PaymentRow from './PaymentRow';
import { t, tf } from '../../i18n';
import { CHARGE_FILTER, PAYMENT_ROW_VARIANT } from '../../constants/finance';
import { countChargesByFilter, filterChargesByStudent, groupChargesByStatus } from '../../utils/financeCharges';

const FILTERS = [
  { id: CHARGE_FILTER.ALL, label: t('finance.filter.all') },
  { id: CHARGE_FILTER.OVERDUE, label: t('finance.filter.overdue') },
  { id: CHARGE_FILTER.PENDING, label: t('finance.filter.pending') },
  { id: CHARGE_FILTER.PAID, label: t('finance.filter.paid') },
];

const SECTION_ORDER = [CHARGE_FILTER.OVERDUE, CHARGE_FILTER.PENDING, CHARGE_FILTER.PAID];

const EMPTY_FILTER_NOTICE = {
  [CHARGE_FILTER.OVERDUE]: 'finance.empty.noOverdue',
  [CHARGE_FILTER.PENDING]: 'finance.empty.noPending',
  [CHARGE_FILTER.PAID]: 'finance.empty.noPaid',
};

const Notice = ({ text }) => <p className="finance-notice type-body">{text}</p>;

Notice.propTypes = { text: PropTypes.string.isRequired };

const ChargesToolbar = ({ searchValue, onSearchChange, filter, onFilterChange, counts }) => (
  <div className="finance-toolbar section-card section-card--compact" role="search">
    <div className="input--search-wrap">
      <Search size={16} strokeWidth={2} aria-hidden="true" />
      <input
        type="text"
        className="input input--search input--on-elevated"
        placeholder={t('finance.search.placeholder')}
        aria-label={t('finance.search.aria')}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
    <Segmented
      ariaLabel={t('finance.filter.aria')}
      items={FILTERS.map((item) => ({ ...item, count: counts[item.id] }))}
      value={filter}
      onChange={onFilterChange}
    />
  </div>
);

ChargesToolbar.propTypes = {
  searchValue: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  filter: PropTypes.string.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  counts: PropTypes.object.isRequired,
};

const ChargeSection = ({ status, rows, rowProps }) => (
  <section className="finance-section" aria-labelledby={`charges-section-${status}`}>
    <h2 id={`charges-section-${status}`} className="finance-section__title type-body-lg-strong">
      {t(`finance.section.${status}`)}
      <span className="finance-section__count"> · {rows.length}</span>
    </h2>
    <div className="charge-list">
      {rows.map((payment) => (
        <PaymentRow
          key={payment.id}
          payment={payment}
          variant={PAYMENT_ROW_VARIANT.OVERVIEW}
          isMutating={rowProps.mutatingId === payment.id}
          onViewHistory={rowProps.onViewHistory}
          {...rowProps.handlers}
        />
      ))}
    </div>
  </section>
);

ChargeSection.propTypes = {
  status: PropTypes.string.isRequired,
  rows: PropTypes.array.isRequired,
  rowProps: PropTypes.object.isRequired,
};

const ChargeSections = ({ groups, filter, rowProps }) => {
  if (filter !== CHARGE_FILTER.ALL) {
    const rows = groups[filter];
    if (rows.length === 0) return <Notice text={t(EMPTY_FILTER_NOTICE[filter])} />;
    return <ChargeSection status={filter} rows={rows} rowProps={rowProps} />;
  }
  const allPaid = groups.overdue.length === 0 && groups.pending.length === 0 && groups.paid.length > 0;
  return (
    <>
      {allPaid && <Notice text={t('finance.empty.allPaid')} />}
      {SECTION_ORDER.filter((status) => groups[status].length > 0).map((status) => (
        <ChargeSection key={status} status={status} rows={groups[status]} rowProps={rowProps} />
      ))}
    </>
  );
};

ChargeSections.propTypes = {
  groups: PropTypes.object.isRequired,
  filter: PropTypes.string.isRequired,
  rowProps: PropTypes.object.isRequired,
};

/**
 * Cobranças list: toolbar (search + status filter with row counts) and the
 * Em atraso → Pendentes → Pagas sections. Statuses come from the API.
 */
const ChargesPanel = ({
  payments,
  filter,
  onFilterChange,
  searchValue,
  onSearchChange,
  searchQuery,
  mutatingId,
  rowHandlers,
  onViewHistory,
}) => {
  const counts = countChargesByFilter(groupChargesByStatus(payments));
  const matching = filterChargesByStudent(payments, searchQuery);
  const rowProps = { mutatingId, handlers: rowHandlers, onViewHistory };
  const noSearchResults = searchQuery.trim() !== '' && matching.length === 0;

  return (
    <>
      <ChargesToolbar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        filter={filter}
        onFilterChange={onFilterChange}
        counts={counts}
      />
      {noSearchResults
        ? <EmptyBlock icon={SearchX} title={tf('finance.search.noResults', { query: searchQuery.trim() })} />
        : <ChargeSections groups={groupChargesByStatus(matching)} filter={filter} rowProps={rowProps} />}
    </>
  );
};

ChargesPanel.propTypes = {
  payments: PropTypes.array.isRequired,
  filter: PropTypes.oneOf(Object.values(CHARGE_FILTER)).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  searchValue: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  searchQuery: PropTypes.string.isRequired,
  mutatingId: PropTypes.string,
  rowHandlers: PropTypes.object.isRequired,
  onViewHistory: PropTypes.func.isRequired,
};

export default ChargesPanel;
