import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import { formatDateForDisplay } from '../../utils/dateFormat';

const ProtocolDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [protocol, setProtocol] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [trainingTemplates, setTrainingTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTrainingForm, setShowTrainingForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingTrainingId, setEditingTrainingId] = useState(null);
  const [selectedTrainingForSchedule, setSelectedTrainingForSchedule] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const [trainingFormData, setTrainingFormData] = useState({
    name: '',
    description: '',
    category: '',
    bodySegment: '',
    notes: '',
    order: 1,
    templateId: '',
  });

  const [scheduleFormData, setScheduleFormData] = useState({
    weekday: 'monday',
    order: 1,
  });

  useEffect(() => {
    fetchProtocol();
    fetchTrainings();
    fetchTrainingTemplates();
  }, [id]);

  const fetchProtocol = async () => {
    try {
      const response = await api.get(`/trainer/protocols/${id}`);
      setProtocol(response.data);
    } catch (error) {
      console.error('Failed to fetch protocol:', error);
      showToast(error.userMessage || translateError(error), 'error');
    }
  };

  const fetchTrainings = async () => {
    try {
      const response = await api.get(`/trainer/protocols/${id}/trainings`);
      setTrainings(response.data);
    } catch (error) {
      console.error('Failed to fetch trainings:', error);
    }
  };

  const fetchTrainingTemplates = async () => {
    try {
      const response = await api.get('/trainer/training-templates');
      setTrainingTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch training templates:', error);
    }
  };

  const handleTrainingSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingTrainingId) {
        const { templateId: _templateId, ...updateData } = trainingFormData;
        await api.patch(`/trainer/trainings/${editingTrainingId}`, updateData);
        showToast('Treino atualizado com sucesso!', 'success');
      } else {
        await api.post(`/trainer/protocols/${id}/trainings`, trainingFormData);
        showToast('Treino criado com sucesso!', 'success');
      }
      fetchTrainings();
      resetTrainingForm();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post(
        `/trainer/trainings/${selectedTrainingForSchedule}/schedule`,
        { weekDays: [scheduleFormData.weekday], order: scheduleFormData.order }
      );
      showToast('Treino agendado com sucesso!', 'success');
      fetchTrainings();
      resetScheduleForm();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTraining = (training) => {
    setTrainingFormData({
      name: training.name,
      description: training.description || '',
      category: training.category || '',
      bodySegment: training.bodySegment || '',
      notes: training.notes || '',
      order: training.order,
      templateId: '',
    });
    setEditingTrainingId(training.id);
    setShowTrainingForm(true);
  };

  const handleDeleteTraining = (trainingId) => {
    setConfirmDialog({
      message: 'Tem certeza que deseja excluir este treino? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/trainings/${trainingId}`);
          showToast('Treino excluído com sucesso!', 'success');
          fetchTrainings();
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const handleScheduleTraining = (trainingId) => {
    setSelectedTrainingForSchedule(trainingId);
    setShowScheduleForm(true);
  };

  const resetTrainingForm = () => {
    setTrainingFormData({
      name: '',
      description: '',
      category: '',
      bodySegment: '',
      notes: '',
      order: 1,
      templateId: '',
    });
    setEditingTrainingId(null);
    setShowTrainingForm(false);
  };

  const resetScheduleForm = () => {
    setScheduleFormData({
      weekday: 'monday',
      order: 1,
    });
    setSelectedTrainingForSchedule(null);
    setShowScheduleForm(false);
  };

  const weekdayLabels = {
    MONDAY: 'Segunda-feira',
    TUESDAY: 'Terça-feira',
    WEDNESDAY: 'Quarta-feira',
    THURSDAY: 'Quinta-feira',
    FRIDAY: 'Sexta-feira',
    SATURDAY: 'Sábado',
    SUNDAY: 'Domingo',
  };

  const assigneeLabel = [protocol?.assignee?.firstName, protocol?.assignee?.lastName]
    .filter(Boolean)
    .join(' ')
    || protocol?.assignee?.name
    || protocol?.assignee?.email
    || 'Aluno';

  if (!protocol) {
    return (
      <div className="empty-state">Carregando...</div>
    );
  }

  return (
    <div>
      <button onClick={() => navigate('/trainer/protocols')} className="btn-back">
        <ArrowLeft size={16} strokeWidth={1.6} /> Voltar para Rotinas
      </button>

      <div className="card card--mb">
        <h1 className="page-title">
          Rotina de {assigneeLabel}
        </h1>
        <div className="grid-2col text-sm">
          <div>
            <span className="info-label info-inline">Status:</span>
            <span className="info-value">{protocol.status}</span>
          </div>
          <div>
            <span className="info-label info-inline">Data de Início:</span>
            <span className="info-value">
              {formatDateForDisplay(protocol.startDate)}
            </span>
          </div>
          <div>
            <span className="info-label info-inline">Data de Término:</span>
            <span className="info-value">
              {formatDateForDisplay(protocol.expirationDate || protocol.endDate)}
            </span>
          </div>
          <div>
            <span className="info-label info-inline">Treinos:</span>
            <span className="info-value">{trainings.length}</span>
          </div>
        </div>
      </div>

      <div className="page-header">
        <h2 className="card-title">Treinos</h2>
        {!showTrainingForm && (
          <button onClick={() => setShowTrainingForm(true)} className="btn-primary">
            + Adicionar Treino
          </button>
        )}
      </div>

      {showTrainingForm && (
        <div className="card card--mb">
          <h3 className="card-title mb-md">
            {editingTrainingId ? 'Editar Treino' : 'Adicionar Novo Treino'}
          </h3>
          <form onSubmit={handleTrainingSubmit} className="form">
            {!editingTrainingId && (
              <div>
                <label className="form-label">Importar de Modelo (opcional)</label>
                <select
                  value={trainingFormData.templateId}
                  onChange={(e) =>
                    setTrainingFormData({ ...trainingFormData, templateId: e.target.value })
                  }
                  className="form-select"
                >
                  <option value="">-- Selecione um modelo --</option>
                  {trainingTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="form-label">Nome</label>
              <input
                type="text"
                value={trainingFormData.name}
                onChange={(e) =>
                  setTrainingFormData({ ...trainingFormData, name: e.target.value })
                }
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">Descrição</label>
              <textarea
                value={trainingFormData.description}
                onChange={(e) =>
                  setTrainingFormData({ ...trainingFormData, description: e.target.value })
                }
                rows={3}
                className="form-textarea"
              />
            </div>

            <div className="grid-responsive-2col">
              <div>
                <label className="form-label">Categoria</label>
                <select
                  value={trainingFormData.category}
                  onChange={(e) =>
                    setTrainingFormData({ ...trainingFormData, category: e.target.value })
                  }
                  className="form-select"
                  required
                >
                  <option value="">Selecione...</option>
                  <option value="strength">Força</option>
                  <option value="cardio">Cardio</option>
                  <option value="flexibility">Flexibilidade</option>
                  <option value="functional">Funcional</option>
                  <option value="mobility">Mobilidade</option>
                  <option value="rest">Descanso</option>
                </select>
              </div>

              <div>
                <label className="form-label">Segmento Corporal</label>
                <select
                  value={trainingFormData.bodySegment}
                  onChange={(e) =>
                    setTrainingFormData({ ...trainingFormData, bodySegment: e.target.value })
                  }
                  className="form-select"
                >
                  <option value="">Selecione...</option>
                  <option value="upper">Superior</option>
                  <option value="lower">Inferior</option>
                  <option value="core">Core</option>
                  <option value="full_body">Corpo Inteiro</option>
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Observações</label>
              <textarea
                value={trainingFormData.notes}
                onChange={(e) =>
                  setTrainingFormData({ ...trainingFormData, notes: e.target.value })
                }
                rows={2}
                className="form-textarea"
                placeholder="Orientações adicionais para este treino"
              />
            </div>

            <div>
              <label className="form-label">Ordem</label>
              <input
                type="number"
                min="1"
                value={trainingFormData.order}
                onChange={(e) =>
                  setTrainingFormData({ ...trainingFormData, order: parseInt(e.target.value) })
                }
                className="form-input"
                required
              />
            </div>

            <div className="btn-group">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
              <button type="button" onClick={resetTrainingForm} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {showScheduleForm && (
        <div className="card card--mb">
          <h3 className="card-title mb-md">Agendar Treino</h3>
          <form onSubmit={handleScheduleSubmit} className="form">
            <div>
              <label className="form-label">Dia da Semana</label>
              <select
                value={scheduleFormData.weekday}
                onChange={(e) =>
                  setScheduleFormData({ ...scheduleFormData, weekday: e.target.value })
                }
                className="form-select"
                required
              >
                <option value="monday">Segunda-feira</option>
                <option value="tuesday">Terça-feira</option>
                <option value="wednesday">Quarta-feira</option>
                <option value="thursday">Quinta-feira</option>
                <option value="friday">Sexta-feira</option>
                <option value="saturday">Sábado</option>
                <option value="sunday">Domingo</option>
              </select>
            </div>

            <div>
              <label className="form-label">Ordem</label>
              <input
                type="number"
                min="1"
                value={scheduleFormData.order}
                onChange={(e) =>
                  setScheduleFormData({ ...scheduleFormData, order: parseInt(e.target.value) })
                }
                className="form-input"
                required
              />
            </div>

            <div className="btn-group">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Agendando...' : 'Agendar'}
              </button>
              <button type="button" onClick={resetScheduleForm} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {!showTrainingForm && !showScheduleForm && <div className="stack-md">
        {trainings.map((training) => (
          <div key={training.id} className="training-card">
            <div className="training-card-header">
              <div>
                <h3 className="training-card-title">{training.name}</h3>
                <p className="training-card-desc">{training.description}</p>
                <div className="training-card-order">Ordem: {training.order}</div>
              </div>
              <div className="training-actions">
                <button onClick={() => handleEditTraining(training)} className="btn-edit-sm">
                  Editar
                </button>
                <button onClick={() => handleScheduleTraining(training.id)} className="btn-schedule-sm">
                  Agendar
                </button>
                <button onClick={() => handleDeleteTraining(training.id)} className="btn-delete-sm">
                  Excluir
                </button>
              </div>
            </div>

            {training.schedules && training.schedules.length > 0 && (
              <div className="schedule-section">
                <h4 className="schedule-title">Agendamentos:</h4>
                <div className="schedule-list">
                  {training.schedules.map((schedule) => (
                    <div key={schedule.id} className="schedule-item">
                      <span className="schedule-item-text">
                        {weekdayLabels[schedule.weekday?.toUpperCase()] || schedule.weekday}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>}

      {trainings.length === 0 && !showTrainingForm && (
        <div className="empty-state">
          <p className="empty-state-title">Nenhum treino ainda</p>
          <p>Adicione treinos a esta rotina</p>
        </div>
      )}

      {confirmDialog && (
        <div className="overlay" onClick={() => setConfirmDialog(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="btn-group">
              <button onClick={confirmDialog.onConfirm} className="btn-danger" style={{ flex: 1 }}>
                Confirmar
              </button>
              <button onClick={() => setConfirmDialog(null)} className="btn-secondary" style={{ flex: 1 }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProtocolDetail;
