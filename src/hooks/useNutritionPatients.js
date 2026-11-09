import { useState } from 'react';
import { inviteByEmail, listPatients, listPendingInvites, resendInvite, revokeInvite, unlinkPatient } from '../api/nutrition';
import useLoadResource from './useLoadResource';

export const PATIENTS_TAB = 'patients';
export const INVITES_TAB = 'invites';

// Fetches the linked patients.
const fetchPatients = async () => (await listPatients()).items;

// Fetches the pending and declined invites.
const fetchInvites = async () => (await listPendingInvites()).items;

// State and mutations of Meus pacientes: patients, open invites and invite / resend / revoke / unlink.
const useNutritionPatients = ({ onReloadError } = {}) => {
  const [tab, setTab] = useState(PATIENTS_TAB);
  const patients = useLoadResource(fetchPatients, 'patients', { onSilentError: onReloadError });
  const invites = useLoadResource(fetchInvites, tab, { enabled: tab === INVITES_TAB, onSilentError: onReloadError });

  const invite = async (email) => {
    const result = await inviteByEmail(email);
    if (result.outcome === 'linked') await patients.reload({ silent: true });
    if (tab === INVITES_TAB) await invites.reload({ silent: true });
    return result;
  };

  const unlink = async (patient) => {
    await unlinkPatient(patient.id);
    patients.setData((list) => list.filter((item) => item.id !== patient.id));
  };

  const resend = async (pendingInvite) => {
    const updated = await resendInvite(pendingInvite.id);
    invites.setData((list) => list.map((item) => (item.id === updated.id ? updated : item)));
  };

  const revoke = async (pendingInvite) => {
    await revokeInvite(pendingInvite.id);
    invites.setData((list) => list.filter((item) => item.id !== pendingInvite.id));
  };

  return { tab, setTab, patients, invites, invite, unlink, resend, revoke };
};

export default useNutritionPatients;
