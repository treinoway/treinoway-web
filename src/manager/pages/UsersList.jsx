import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Search, Users } from 'lucide-react';
import { t } from '../../i18n';
import { formatDateTimeForDisplay } from '../../utils/dateFormat';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import useResettablePage from '../../hooks/useResettablePage';
import Banner from '../../components/ds/Banner';
import EmptyBlock from '../../components/ds/EmptyBlock';
import Segmented from '../../components/ds/Segmented';
import SkeletonRows from '../../components/ds/SkeletonRows';
import { listUsers } from '../api';
import { getDisplayName } from '../format';
import useManagerQuery from '../useManagerQuery';
import Pagination from '../components/Pagination';
import RoleBadges from '../components/RoleBadges';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

// One user row; the whole row navigates to the user detail.
const UserRow = ({ user, onOpen }) => {
  const name = getDisplayName(user);
  return (
    <tr className="manager-row--link" onClick={() => onOpen(user.id)}>
      <td>
        <button type="button" className="manager-row-link type-body-strong">
          {name}
        </button>
        <span className="table-col-mobile-only admin-table__sub type-caption">{user.email}</span>
      </td>
      <td className="table-col-desktop-only">{user.email}</td>
      <td>
        <RoleBadges roles={user.roles} isStudent={user.isStudent} deletedAt={user.deletedAt} />
      </td>
      <td className="admin-table__number">{formatDateTimeForDisplay(user.createdAt)}</td>
    </tr>
  );
};

UserRow.propTypes = {
  user: PropTypes.object.isRequired,
  onOpen: PropTypes.func.isRequired,
};

// Responsive users table: email moves under the name on mobile.
const UsersTable = ({ users, onOpen }) => (
  <div className="section-card admin-table-wrap">
    <table className="admin-table type-body">
      <thead>
        <tr>
          <th className="type-caption-strong">{t('manager.colUser')}</th>
          <th className="type-caption-strong table-col-desktop-only">{t('manager.colEmail')}</th>
          <th className="type-caption-strong">{t('manager.colRoles')}</th>
          <th className="type-caption-strong">{t('manager.colCreated')}</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <UserRow key={user.id} user={user} onOpen={onOpen} />
        ))}
      </tbody>
    </table>
  </div>
);

UsersTable.propTypes = {
  users: PropTypes.array.isRequired,
  onOpen: PropTypes.func.isRequired,
};

// Search box that filters users by name or email.
const UserSearch = ({ value, onChange }) => (
  <div className="field admin-search">
    <label className="field-label type-caption-strong" htmlFor="manager-users-search">
      {t('manager.searchLabel')}
    </label>
    <div className="input--search-wrap">
      <Search size={16} strokeWidth={2} aria-hidden="true" />
      <input
        id="manager-users-search"
        type="text"
        className="input input--search"
        placeholder={t('manager.searchPlaceholder')}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  </div>
);

UserSearch.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

// Backoffice users list: debounced search, kind filter and pagination.
const UsersList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('all');
  const kindItems = useMemo(
    () => [
      { id: 'all', label: t('manager.kind.all') },
      { id: 'trainer', label: t('manager.kind.trainer') },
      { id: 'student', label: t('manager.kind.student') },
      { id: 'admin', label: t('manager.kind.admin') },
    ],
    []
  );
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const [page, setPage] = useResettablePage(`${debouncedSearch}|${kind}`);
  const request = useCallback(
    () =>
      listUsers({
        search: debouncedSearch || undefined,
        kind: kind === 'all' ? undefined : kind,
        page,
        pageSize: PAGE_SIZE,
      }),
    [debouncedSearch, kind, page]
  );
  const { data, message, loading } = useManagerQuery(request);

  const handleOpen = (userId) => navigate(`/manager/users/${userId}`);
  const users = data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const isEmpty = !loading && !message && users.length === 0;

  return (
    <div className="admin-page">
      <h1 className="type-h1">{t('manager.usersTitle')}</h1>
      <div className="admin-filter-bar">
        <UserSearch value={search} onChange={setSearch} />
        <Segmented ariaLabel={t('manager.kindLabel')} items={kindItems} value={kind} onChange={setKind} />
      </div>
      {loading && <SkeletonRows label={t('manager.loadingUsers')} count={6} />}
      {message && <Banner tone="error">{message}</Banner>}
      {isEmpty && <EmptyBlock icon={Users} title={t('manager.usersEmpty')} />}
      {users.length > 0 && (
        <>
          <UsersTable users={users} onOpen={handleOpen} />
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </>
      )}
    </div>
  );
};

export default UsersList;
