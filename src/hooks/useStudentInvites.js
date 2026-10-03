import { useState, useEffect, useCallback, useRef } from 'react';
import {
  listStudentInvites,
  resendStudentInvite,
  revokeStudentInvite,
} from '../api/studentInvites';
import { STUDENT_INVITE_FILTER_ALL, STUDENT_INVITE_PAGE_SIZE } from '../constants/studentInvite';

const toStatusParam = (statusFilter) =>
  (statusFilter === STUDENT_INVITE_FILTER_ALL ? undefined : statusFilter);

/**
 * Loads the trainer's student invites (filter + pagination) and exposes
 * resend/revoke mutations that keep the local list in sync.
 * Bump `refreshKey` to force a reload (e.g. after a new invite is sent).
 */
const useStudentInvites = ({ refreshKey = 0 } = {}) => {
  const [statusFilter, setStatusFilterState] = useState(STUDENT_INVITE_FILTER_ALL);
  const [page, setPage] = useState(1);
  const [invites, setInvites] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const latestRequestRef = useRef(0);

  const fetchInvites = useCallback(async () => {
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listStudentInvites({
        status: toStatusParam(statusFilter),
        page,
        pageSize: STUDENT_INVITE_PAGE_SIZE,
      });
      if (requestId !== latestRequestRef.current) return;
      setInvites(data?.items ?? []);
      setTotal(data?.total ?? 0);
    } catch (error) {
      if (requestId === latestRequestRef.current) setLoadError(error);
    } finally {
      if (requestId === latestRequestRef.current) setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites, refreshKey]);

  const setStatusFilter = useCallback((nextFilter) => {
    setStatusFilterState(nextFilter);
    setPage(1);
  }, []);

  // An updated invite that no longer matches the active filter leaves the list.
  const applyUpdatedInvite = useCallback((updated) => {
    const stillMatches = statusFilter === STUDENT_INVITE_FILTER_ALL || updated.status === statusFilter;
    if (stillMatches) {
      setInvites((prev) => prev.map((invite) => (invite.id === updated.id ? updated : invite)));
      return;
    }
    setInvites((prev) => prev.filter((invite) => invite.id !== updated.id));
    setTotal((prev) => Math.max(0, prev - 1));
  }, [statusFilter]);

  const resendInvite = useCallback(async (invite) => {
    const { invite: updated } = await resendStudentInvite(invite.id);
    applyUpdatedInvite(updated);
    return updated;
  }, [applyUpdatedInvite]);

  const revokeInvite = useCallback(async (invite) => {
    const { invite: updated } = await revokeStudentInvite(invite.id);
    applyUpdatedInvite(updated);
    return updated;
  }, [applyUpdatedInvite]);

  const pageCount = Math.max(1, Math.ceil(total / STUDENT_INVITE_PAGE_SIZE));

  return {
    invites,
    total,
    page,
    pageCount,
    setPage,
    statusFilter,
    setStatusFilter,
    loading,
    loadError,
    reload: fetchInvites,
    resendInvite,
    revokeInvite,
  };
};

export default useStudentInvites;
