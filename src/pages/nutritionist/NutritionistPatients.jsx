import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Users, Plus, X, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import RowMenu from '../../components/RowMenu';
import api from '../../api/axios';
import { translateError } from '../../i18n';
import { useToast } from '../../contexts/ToastContext';
import { ACTIVITY_LEVEL_OPTIONS, TMB_FORMULA_OPTIONS, GENDER_OPTIONS } from '../../constants/diet';
import Select from '../../components/Select';

// Merges the nested patient user fields into the link object for easier access
const flattenPatientLink = (link) => ({
  ...link,
  ...(link.patient ?? {}),
});

/* ─── LinkPatientModal ───────────────────────────────────────────────────── */

const LinkPatientModal = ({ onClose, onSubmit, linking }) => {
  const [email, setEmail] = useState('');

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    onSubmit(email.trim());
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="bottom-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-patient-title"
      >
        <div className="bottom-sheet-header">
          <h2 id="link-patient-title" className="bottom-sheet-title">Vincular paciente</h2>
          <button type="button" className="bottom-sheet-close" aria-label="Fechar" onClick={onClose}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="bottom-sheet-body">
          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label className="form-label" htmlFor="link-patient-email">
                E-mail do paciente
              </label>
              <input
                id="link-patient-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="paciente@email.com"
                required
                autoFocus
                disabled={linking}
              />
            </div>
            <div className="btn-group" style={{ marginTop: 'var(--spacing-xl)' }}>
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

LinkPatientModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  linking: PropTypes.bool.isRequired,
};

/* ─── MetabolicProfileCard ───────────────────────────────────────────────── */

const MetabolicProfileCard = ({ patientId, existingProfile, onSaved }) => {
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    weightKg: existingProfile?.weightKg?.toString() ?? '',
    heightCm: existingProfile?.heightCm?.toString() ?? '',
    age: existingProfile?.age?.toString() ?? '',
    gender: existingProfile?.gender ?? '',
    tmbFormula: existingProfile?.tmbFormula ?? 'mifflin_st_jeor',
    activityLevel: existingProfile?.activityLevel ?? '',
  });

  const hasProfile = !!(existingProfile?.tmbKcal);

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        weightKg: parseFloat(form.weightKg),
        heightCm: parseFloat(form.heightCm),
        tmbFormula: form.tmbFormula,
        activityLevel: form.activityLevel,
      };
      if (form.age) payload.age = parseInt(form.age, 10);
      if (form.gender) payload.gender = form.gender;

      const res = await api.put(
        `/nutritionist/patients/${patientId}/metabolic-profile`,
        payload,
      );
      showToast('Perfil metabólico salvo', 'success');
      onSaved(res.data);
      setExpanded(false);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="metabolic-card">
      <div className="metabolic-card-header">
        <div className="metabolic-card-title-row">
          <Activity size={16} strokeWidth={2} aria-hidden="true" />
          <span className="metabolic-card-title">Perfil Metabólico</span>
        </div>
        {hasProfile && (
          <div className="metabolic-card-results">
            <span className="metabolic-result">
              <span className="metabolic-result-label">TMB</span>
              <span className="metabolic-result-value">{Math.round(existingProfile.tmbKcal)} kcal</span>
            </span>
            <span className="metabolic-result-divider" />
            <span className="metabolic-result">
              <span className="metabolic-result-label">GET</span>
              <span className="metabolic-result-value">{Math.round(existingProfile.getKcal)} kcal</span>
            </span>
          </div>
        )}
        <button
          type="button"
          className="metabolic-card-toggle"
          aria-expanded={expanded}
          aria-label={expanded ? 'Fechar perfil metabólico' : 'Editar perfil metabólico'}
          onClick={() => setExpanded((o) => !o)}
        >
          {expanded ? <ChevronUp size={16} strokeWidth={2} /> : <ChevronDown size={16} strokeWidth={2} />}
        </button>
      </div>

      {!hasProfile && !expanded && (
        <button
          type="button"
          className="metabolic-card-cta"
          onClick={() => setExpanded(true)}
        >
          Preencher perfil metabólico
        </button>
      )}

      {expanded && (
        <form onSubmit={handleSubmit} className="form metabolic-card-form">
          <div className="grid-responsive-2col">
            <div className="form-group">
              <label className="form-label" htmlFor={`weight-${patientId}`}>Peso (kg)</label>
              <input
                id={`weight-${patientId}`}
                type="number"
                min="1"
                step="0.1"
                className="form-input"
                value={form.weightKg}
                onChange={handleChange('weightKg')}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor={`height-${patientId}`}>Altura (cm)</label>
              <input
                id={`height-${patientId}`}
                type="number"
                min="1"
                step="0.1"
                className="form-input"
                value={form.heightCm}
                onChange={handleChange('heightCm')}
                required
              />
            </div>
          </div>

          <div className="grid-responsive-2col">
            <div className="form-group">
              <label className="form-label" htmlFor={`age-${patientId}`}>Idade</label>
              <input
                id={`age-${patientId}`}
                type="number"
                min="1"
                className="form-input"
                value={form.age}
                onChange={handleChange('age')}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor={`gender-${patientId}`}>Sexo</label>
              <Select
                id={`gender-${patientId}`}
                value={form.gender}
                onChange={handleChange('gender')}
              >
                <option value="">Selecione…</option>
                {GENDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor={`formula-${patientId}`}>Fórmula TMB</label>
            <Select
              id={`formula-${patientId}`}
              value={form.tmbFormula}
              onChange={handleChange('tmbFormula')}
              required
            >
              {TMB_FORMULA_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor={`activity-${patientId}`}>Nível de atividade</label>
            <Select
              id={`activity-${patientId}`}
              value={form.activityLevel}
              onChange={handleChange('activityLevel')}
              required
            >
              <option value="">Selecione…</option>
              {ACTIVITY_LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>

          <div className="btn-group">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar perfil'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setExpanded(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

MetabolicProfileCard.propTypes = {
  patientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  existingProfile: PropTypes.shape({
    weightKg: PropTypes.number,
    heightCm: PropTypes.number,
    tmbKcal: PropTypes.number,
    getKcal: PropTypes.number,
    tmbFormula: PropTypes.string,
    activityLevel: PropTypes.string,
    age: PropTypes.number,
    gender: PropTypes.string,
  }),
  onSaved: PropTypes.func.isRequired,
};

MetabolicProfileCard.defaultProps = {
  existingProfile: null,
};

/* ─── PatientCard ────────────────────────────────────────────────────────── */

const PatientCard = ({ patient, onUnlink, onProfileSaved }) => {
  const fullName = [patient.firstName, patient.lastName].filter(Boolean).join(' ') || patient.email;

  return (
    <div className="card">
      <div className="card-header-row">
        <div>
          <h3 className="card-subtitle">{fullName}</h3>
          {patient.email && (
            <p className="text-sm" style={{ color: 'var(--color-on-surface-variant)', marginTop: 'var(--spacing-2xs)' }}>
              {patient.email}
            </p>
          )}
        </div>
        <RowMenu
          ariaLabel={`Ações de ${fullName}`}
          onDelete={() => onUnlink(patient)}
          deleteLabel="Desvincular"
        />
      </div>
      <MetabolicProfileCard
        patientId={patient.id}
        existingProfile={patient.metabolicProfile}
        onSaved={(profile) => onProfileSaved(patient.id, profile)}
      />
    </div>
  );
};

PatientCard.propTypes = {
  patient: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    email: PropTypes.string,
    metabolicProfile: PropTypes.object,
  }).isRequired,
  onUnlink: PropTypes.func.isRequired,
  onProfileSaved: PropTypes.func.isRequired,
};

/* ─── NutritionistPatients ───────────────────────────────────────────────── */

const NutritionistPatients = () => {
  const { showToast } = useToast();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linking, setLinking] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/nutritionist/patients');
      setPatients(res.data.map(flattenPatientLink));
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleLinkSubmit = async (email) => {
    setLinking(true);
    try {
      const res = await api.post('/nutritionist/patients', { email });
      setPatients((prev) => [...prev, flattenPatientLink(res.data)]);
      showToast('Paciente vinculado com sucesso', 'success');
      setShowLinkModal(false);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkPatient = (patient) => {
    const name = [patient.firstName, patient.lastName].filter(Boolean).join(' ') || patient.email;
    setConfirmDialog({
      message: `Desvincular ${name}? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/nutritionist/patients/${patient.id}`);
          setPatients((prev) => prev.filter((p) => p.id !== patient.id));
          showToast('Paciente desvinculado', 'success');
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const handleProfileSaved = (patientId, profile) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patientId ? { ...p, metabolicProfile: profile } : p,
      ),
    );
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title-row">
          <Users size={24} className="page-header-title-icon" />
          <h1>Pacientes</h1>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowLinkModal(true)}
          >
            <Plus size={16} strokeWidth={2} />
            Vincular paciente
          </button>
        </div>
      </div>

      {patients.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon empty-state-icon--accent">
            <Users size={32} strokeWidth={1.2} />
          </div>
          <p className="empty-state-title">Nenhum paciente vinculado ainda</p>
          <p>Vincule seu primeiro paciente para começar a prescrever dietas.</p>
          <button className="btn-primary" onClick={() => setShowLinkModal(true)}>
            <Plus size={16} strokeWidth={2} />
            Vincular primeiro paciente
          </button>
        </div>
      ) : (
        <div className="grid-cards">
          {patients.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onUnlink={handleUnlinkPatient}
              onProfileSaved={handleProfileSaved}
            />
          ))}
        </div>
      )}

      {showLinkModal && (
        <LinkPatientModal
          onClose={() => setShowLinkModal(false)}
          onSubmit={handleLinkSubmit}
          linking={linking}
        />
      )}

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
    </div>
  );
};

export default NutritionistPatients;
