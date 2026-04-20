import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import Select from '../components/Select';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import { getServiceModeLabel } from '../constants/serviceMode';
import api from '../api/axios';

const serviceModeBadgeClass = (mode) => {
  if (mode === 'online') return 'badge badge-blue';
  if (mode === 'in_person') return 'badge badge-green';
  return 'badge';
};

const NutritionistProfileSection = () => {
  const { showToast } = useToast();
  const [profileLoading, setProfileLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nutritionist, setNutritionist] = useState(null);
  const [hidden, setHidden] = useState(false);

  const [formData, setFormData] = useState({
    professionalDocument: '',
    clinicName: '',
    serviceMode: 'online',
    notes: '',
  });

  useEffect(() => {
    fetchNutritionistProfile();
  }, []);

  const fetchNutritionistProfile = async () => {
    setProfileLoading(true);
    try {
      const response = await api.get('/nutritionist');
      const data = response.data;
      setNutritionist(data);
      setFormData({
        professionalDocument: data.professionalDocument || '',
        clinicName: data.clinicName || '',
        serviceMode: data.serviceMode || 'online',
        notes: data.notes || '',
      });
    } catch (error) {
      if (error.response?.status === 403) {
        setHidden(true);
      } else {
        console.error('Failed to fetch nutritionist profile:', error);
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCancel = () => {
    if (nutritionist) {
      setFormData({
        professionalDocument: nutritionist.professionalDocument || '',
        clinicName: nutritionist.clinicName || '',
        serviceMode: nutritionist.serviceMode || 'online',
        notes: nutritionist.notes || '',
      });
    }
    setEditing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {};
      if (formData.professionalDocument.trim()) payload.professionalDocument = formData.professionalDocument.trim();
      if (formData.clinicName.trim()) payload.clinicName = formData.clinicName.trim();
      if (formData.serviceMode) payload.serviceMode = formData.serviceMode;
      if (formData.notes.trim()) payload.notes = formData.notes.trim();

      const response = await api.patch('/nutritionist', { nutritionist: payload });
      setNutritionist(response.data);
      setFormData({
        professionalDocument: response.data.professionalDocument || '',
        clinicName: response.data.clinicName || '',
        serviceMode: response.data.serviceMode || 'online',
        notes: response.data.notes || '',
      });
      showToast('Dados profissionais atualizados!', 'success');
      setEditing(false);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (hidden) return null;

  if (profileLoading) {
    return (
      <div className="card card--mb">
        <div className="loading-screen">
          <span className="loading-text">Carregando...</span>
        </div>
      </div>
    );
  }

  const isComplete = !!nutritionist?.profileCompletedAt;
  const modeLabel = getServiceModeLabel(nutritionist?.serviceMode) || nutritionist?.serviceModeLabel;
  const modeBadgeClass = serviceModeBadgeClass(nutritionist?.serviceMode);

  const dataFields = [
    nutritionist?.professionalDocument,
    nutritionist?.clinicName,
    nutritionist?.serviceMode,
    nutritionist?.notes,
  ];
  const emptyCount = dataFields.filter((val) => !val).length;

  return (
    <div className="card card--mb">
      <div className="card-header">
        <div>
          <h2 className="card-title">Informações do Nutricionista</h2>
          {!editing && modeLabel && (
            <span className={`${modeBadgeClass} card-header-badge`}>
              {modeLabel}
            </span>
          )}
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn-primary">
            Editar
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSubmit} className="form fade-in">
          <div>
            <label className="form-label" htmlFor="nutri-crn">CRN</label>
            <input
              id="nutri-crn"
              type="text"
              value={formData.professionalDocument}
              onChange={(e) => setFormData({ ...formData, professionalDocument: e.target.value })}
              className="form-input"
              placeholder="Ex: CRN-3 12345"
              disabled={loading}
            />
          </div>

          <div>
            <label className="form-label" htmlFor="nutri-clinic">Local de atendimento</label>
            <input
              id="nutri-clinic"
              type="text"
              value={formData.clinicName}
              onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
              className="form-input"
              placeholder="Ex: Clínica Saúde Plena"
              disabled={loading}
            />
          </div>

          <div>
            <label className="form-label" htmlFor="nutri-service-mode">Modo de atendimento</label>
            <Select
              id="nutri-service-mode"
              value={formData.serviceMode}
              onChange={(e) => setFormData({ ...formData, serviceMode: e.target.value })}
              disabled={loading}
            >
              <option value="online">Online</option>
              <option value="in_person">Presencial</option>
              <option value="hybrid">Híbrido</option>
            </Select>
          </div>

          <div>
            <label className="form-label" htmlFor="nutri-notes">Especialidades</label>
            <textarea
              id="nutri-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="form-input"
              maxLength={500}
              rows={4}
              disabled={loading}
            />
          </div>

          <div className="btn-group">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
            <button type="button" onClick={handleCancel} disabled={loading} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="fade-in">
          <div className="profile-section">
            <div className="profile-section-header">
              <h3 className="profile-section-title">Dados Profissionais</h3>
              {isComplete ? (
                <Check size={16} className="section-complete-icon" aria-label="Seção completa" />
              ) : (
                <span className="section-incomplete-text">Incompleto</span>
              )}
            </div>
            {emptyCount === dataFields.length ? (
              <p className="info-empty-summary">
                {emptyCount} campos não preenchidos
              </p>
            ) : (
              <div className="info-stacked">
                {nutritionist?.professionalDocument && (
                  <div>
                    <span className="info-label">CRN</span>
                    <span className="info-value">{nutritionist.professionalDocument}</span>
                  </div>
                )}
                {nutritionist?.clinicName && (
                  <div>
                    <span className="info-label">Local de atendimento</span>
                    <span className="info-value">{nutritionist.clinicName}</span>
                  </div>
                )}
                {modeLabel && (
                  <div>
                    <span className="info-label">Modo de atendimento</span>
                    <span className="info-value">{modeLabel}</span>
                  </div>
                )}
                {nutritionist?.notes && (
                  <div>
                    <span className="info-label">Especialidades</span>
                    <span className="info-value">{nutritionist.notes}</span>
                  </div>
                )}
              </div>
            )}
            {emptyCount > 0 && emptyCount < dataFields.length && (
              <p className="info-empty-summary">
                {emptyCount} {emptyCount === 1 ? 'campo não preenchido' : 'campos não preenchidos'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NutritionistProfileSection;
