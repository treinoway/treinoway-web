import { useState } from 'react';
import PropTypes from 'prop-types';
import { Mail, Plus, Users } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import { isEmailVerificationRequired } from '../../lib/emailVerificationGate';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import useNutritionPatients, { INVITES_TAB, PATIENTS_TAB } from '../../hooks/useNutritionPatients';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import EmptyBlock from '../../components/ds/EmptyBlock';
import LibraryPageHeader from '../../components/LibraryPageHeader';
import InvitePatientModal from '../../components/nutrition/InvitePatientModal';
import InviteRow from '../../components/nutrition/InviteRow';
import LoadState from '../../components/nutrition/LoadState';
import PatientRow from '../../components/nutrition/PatientRow';
import PatientTabs from '../../components/nutrition/PatientTabs';
import { formatFlexible, formatInteger, personName } from '../../utils/nutritionFormat';

// Toast text for an invite outcome.
const inviteToast = (result, email) => (result.outcome === 'linked'
  ? 'Paciente vinculado.'
  : `Convite enviado para ${email}.`);

// Average of the 7-day adherence of the patients that have data ("-" when nobody has).
const averageAdherence = (patients) => {
  const values = patients.filter((patient) => patient.adherence7d).map((patient) => patient.adherence7d.percent);
  if (values.length === 0) return '-';
  return `${formatFlexible(Math.round(values.reduce((sum, value) => sum + value, 0) / values.length))}%`;
};

// One summary tile: eyebrow label and a big value.
const StatTile = ({ label, value }) => (
  <div className="nutri-kpi">
    <span className="nutri-eyebrow">{label}</span>
    <span className="nutri-kpi__value">{value}</span>
  </div>
);

StatTile.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.string.isRequired };

// KPI-style counts above the list: patients, published plans and average adherence.
const PatientStats = ({ patients }) => (
  <div className="nutri-stats" role="group" aria-label="Resumo dos pacientes">
    <StatTile label="Pacientes" value={formatInteger(patients.length)} />
    <StatTile label="Planos publicados" value={formatInteger(patients.filter((patient) => patient.plan?.status === 'published').length)} />
    <StatTile label="Adesão média · 7 dias" value={averageAdherence(patients)} />
  </div>
);

PatientStats.propTypes = { patients: PropTypes.arrayOf(PropTypes.object).isRequired };

// Table of linked patients.
const PatientsTable = ({ patients, onUnlink }) => (
  <table className="data-table data-table--nutrition nutri-table">
    <thead>
      <tr><th>Paciente</th><th>Plano</th><th>Adesão 7 dias</th><th><span className="visually-hidden">Ações</span></th></tr>
    </thead>
    <tbody>{patients.map((patient) => <PatientRow key={patient.id} patient={patient} onUnlink={onUnlink} />)}</tbody>
  </table>
);

// Table of open (pending or declined) invites.
const InvitesTable = ({ invites, onResend, onRevoke }) => (
  <table className="data-table data-table--nutrition nutri-table">
    <thead><tr><th>Convite</th><th><span className="visually-hidden">Ações</span></th></tr></thead>
    <tbody>{invites.map((invite) => <InviteRow key={invite.id} invite={invite} onResend={onResend} onRevoke={onRevoke} />)}</tbody>
  </table>
);

PatientsTable.propTypes = {
  patients: PropTypes.arrayOf(PropTypes.object).isRequired,
  onUnlink: PropTypes.func.isRequired,
};

InvitesTable.propTypes = {
  invites: PropTypes.arrayOf(PropTypes.object).isRequired,
  onResend: PropTypes.func.isRequired,
  onRevoke: PropTypes.func.isRequired,
};

/** Meus pacientes: linked patients, pending invites and the invite-by-email flow. */
const Patients = () => {
  const { showToast } = useToast();
  const state = useNutritionPatients({ onReloadError: (message) => showToast(message, 'error') });
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const [modalOpen, setModalOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const patients = state.patients.data ?? [];
  const invites = state.invites.data ?? [];
  const isPatientsTab = state.tab === PATIENTS_TAB;
  const showHeaderAction = !(isPatientsTab && !state.patients.loading && !state.patients.error && patients.length === 0);
  const tabs = [
    { id: PATIENTS_TAB, label: 'Pacientes', count: state.patients.data ? patients.length : undefined },
    { id: INVITES_TAB, label: 'Convites' },
  ];

  const handleInvite = async (email) => {
    setInviting(true);
    try {
      const result = await state.invite(email);
      showToast(inviteToast(result, email), 'success');
      setModalOpen(false);
    } catch (error) {
      // why: the app shell opens the e-mail confirmation modal for this refusal, so a toast would repeat it
      if (!isEmailVerificationRequired(error)) showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleResend = async (invite) => {
    try {
      await state.resend(invite);
      showToast('Convite reenviado.', 'success');
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    }
  };

  const handleUnlink = (patient) => requestConfirm({
    message: `Desvincular ${personName(patient)}? Você deixa de ver o plano alimentar deste paciente.`,
    confirmLabel: 'Desvincular',
    busyLabel: 'Desvinculando…',
    onConfirm: () => state.unlink(patient),
  });

  const handleRevoke = (invite) => requestConfirm({
    message: `Revogar o convite para ${invite.email}? Ele não poderá mais ser aceito.`,
    confirmLabel: 'Revogar',
    busyLabel: 'Revogando…',
    onConfirm: () => state.revoke(invite),
  });

  const openModal = () => setModalOpen(true);

  const patientsBody = patients.length === 0
    ? <EmptyBlock icon={Users} title="Nenhum paciente ainda" description="Convide um paciente pelo e-mail para montar o plano alimentar." actionLabel="Convidar paciente" onAction={openModal} />
    : <PatientsTable patients={patients} onUnlink={handleUnlink} />;

  const invitesBody = invites.length === 0
    ? <EmptyBlock icon={Mail} title="Sem convites pendentes" description="Os convites enviados que o paciente ainda não aceitou ou recusou aparecem aqui." />
    : <InvitesTable invites={invites} onResend={handleResend} onRevoke={handleRevoke} />;

  const activeResource = isPatientsTab ? state.patients : state.invites;

  return (
    <div className="nutri-page">
      <LibraryPageHeader
        icon={Users}
        title="Meus pacientes"
        actions={showHeaderAction && (
          <button type="button" className="btn btn--primary nutri-caps" onClick={openModal}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Convidar paciente
          </button>
        )}
      />
      {isPatientsTab && patients.length > 0 && <PatientStats patients={patients} />}
      <PatientTabs ariaLabel="Seções de pacientes" tabs={tabs} value={state.tab} onChange={state.setTab} />
      <LoadState loading={activeResource.loading} error={activeResource.error} onRetry={activeResource.reload}>
        <section className="nutri-card nutri-card--table">{isPatientsTab ? patientsBody : invitesBody}</section>
      </LoadState>
      {modalOpen && <InvitePatientModal onClose={() => setModalOpen(false)} onSubmit={handleInvite} submitting={inviting} />}
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  );
};

export default Patients;
