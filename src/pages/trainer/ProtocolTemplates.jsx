import { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';

const ProtocolTemplates = () => {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [trainingTemplates, setTrainingTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showTrainingTemplateModal, setShowTrainingTemplateModal] = useState(false);
  const [creatingForIndex, setCreatingForIndex] = useState(null);
  const [savingTrainingTemplate, setSavingTrainingTemplate] = useState(false);

  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    description: '',
    availableWeekDays: [],
    defaultDurationWeeks: 12,
    genderOrdination: '',
    trainingLevel: '',
    trainings: [],
  });

  const [trainingTemplateFormData, setTrainingTemplateFormData] = useState({
    name: '',
    description: '',
    category: '',
    bodySegment: '',
    isPublic: false,
  });

  const weekdayAbbreviations = {
    monday: 'Seg',
    tuesday: 'Ter',
    wednesday: 'Qua',
    thursday: 'Qui',
    friday: 'Sex',
    saturday: 'Sáb',
    sunday: 'Dom',
  };

  const weekDayOptions = [
    { value: 'monday', label: 'Segunda' },
    { value: 'tuesday', label: 'Terça' },
    { value: 'wednesday', label: 'Quarta' },
    { value: 'thursday', label: 'Quinta' },
    { value: 'friday', label: 'Sexta' },
    { value: 'saturday', label: 'Sábado' },
    { value: 'sunday', label: 'Domingo' },
  ];

  useEffect(() => {
    fetchTemplates();
    fetchTrainingTemplates();
  }, []);

  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const response = await api.get('/trainer/protocol-templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch protocol templates:', error);
    } finally {
      setTemplatesLoading(false);
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

  const handleTemplateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        await api.patch(`/trainer/protocol-templates/${editingId}`, templateFormData);
        showToast('Modelo atualizado com sucesso!', 'success');
      } else {
        await api.post('/trainer/protocol-templates', templateFormData);
        showToast('Modelo criado com sucesso!', 'success');
      }
      await fetchTemplates();
      resetTemplateForm();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateEdit = async (template) => {
    setEditingId(template.id);
    setShowForm(true);

    try {
      const response = await api.get(`/trainer/protocol-templates/${template.id}`);
      const full = response.data;
      setTemplateFormData({
        name: full.name,
        description: full.description || '',
        availableWeekDays: (full.availableWeekDays || []).map((day) => day.toLowerCase()),
        defaultDurationWeeks: full.defaultDurationWeeks || 12,
        genderOrdination: full.genderOrdination?.toLowerCase() || '',
        trainingLevel: full.trainingLevel?.toLowerCase() || '',
        trainings: (full.scheduleTemplates || []).map((scheduleTemplate) => ({
          trainingTemplateId: scheduleTemplate.trainingTemplate?.id || scheduleTemplate.trainingTemplateId,
          weekDay: scheduleTemplate.weekDay?.toLowerCase(),
          order: scheduleTemplate.order,
        })),
      });
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    }
  };

  const handleTemplateDelete = (id) => {
    setConfirmDialog({
      message: 'Tem certeza que deseja excluir este modelo? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/protocol-templates/${id}`);
          showToast('Modelo excluído com sucesso!', 'success');
          await fetchTemplates();
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const resetTemplateForm = () => {
    setTemplateFormData({
      name: '',
      description: '',
      availableWeekDays: [],
      defaultDurationWeeks: 12,
      genderOrdination: '',
      trainingLevel: '',
      trainings: [],
    });
    setEditingId(null);
    setShowForm(false);
  };

  const openTrainingTemplateModal = (index = null) => {
    setCreatingForIndex(index);
    setTrainingTemplateFormData({
      name: '',
      description: '',
      category: '',
      bodySegment: '',
      isPublic: false,
    });
    setShowTrainingTemplateModal(true);
  };

  const closeTrainingTemplateModal = () => {
    setShowTrainingTemplateModal(false);
    setCreatingForIndex(null);
  };

  const handleTrainingTemplateCreate = async (e) => {
    e.preventDefault();
    setSavingTrainingTemplate(true);

    try {
      const response = await api.post('/trainer/training-templates', trainingTemplateFormData);
      const created = response.data;
      showToast('Modelo de treino criado com sucesso!', 'success');
      await fetchTrainingTemplates();

      if (creatingForIndex !== null) {
        const updated = [...templateFormData.trainings];
        updated[creatingForIndex] = { ...updated[creatingForIndex], trainingTemplateId: created.id };
        setTemplateFormData({ ...templateFormData, trainings: updated });
      }

      closeTrainingTemplateModal();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSavingTrainingTemplate(false);
    }
  };

  const handleAddExistingTraining = () => {
    setTemplateFormData({
      ...templateFormData,
      trainings: [
        ...templateFormData.trainings,
        { trainingTemplateId: '', weekDay: '', order: templateFormData.trainings.length + 1 },
      ],
    });
  };

  return (
    <div>
      {templatesLoading && !showForm && (
        <div className="loading-screen">
          <span className="loading-text">Carregando...</span>
        </div>
      )}

      <div className="page-header">
        <h1>Modelos de Rotina</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Novo Modelo
          </button>
        )}
      </div>

      {!showForm && !templatesLoading && templates.length === 0 && (
        <div className="alert alert-info" style={{ marginBottom: 'var(--spacing-md)' }}>
          <strong>O que é um modelo?</strong> Um modelo é uma estrutura de rotina pré-definida com
          treinos, dias da semana e duração para reutilização rápida.
        </div>
      )}

      {showForm && (
        <div className="card card--mb">
          <h2 className="card-title mb-md">
            {editingId ? 'Editar Modelo' : 'Criar Novo Modelo'}
          </h2>
          <form onSubmit={handleTemplateSubmit} className="form">
            <div>
              <label className="form-label">Nome</label>
              <input
                type="text"
                value={templateFormData.name}
                onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">Descrição</label>
              <textarea
                value={templateFormData.description}
                onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
                rows={3}
                className="form-textarea"
              />
            </div>

            <div>
              <label className="form-label">Dias Disponíveis</label>
              <div className="weekday-grid">
                {weekDayOptions.map((day) => (
                  <label key={day.value}>
                    <input
                      type="checkbox"
                      checked={templateFormData.availableWeekDays.includes(day.value)}
                      onChange={(e) => {
                        const newDays = e.target.checked
                          ? [...templateFormData.availableWeekDays, day.value]
                          : templateFormData.availableWeekDays.filter((currentDay) => currentDay !== day.value);
                        setTemplateFormData({ ...templateFormData, availableWeekDays: newDays });
                      }}
                    />
                    <span className="text-sm">{day.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid-responsive-2col">
              <div>
                <label className="form-label">Classificação</label>
                <select
                  value={templateFormData.genderOrdination}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, genderOrdination: e.target.value })}
                  className="form-select"
                >
                  <option value="">Selecione...</option>
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                  <option value="other">Outro</option>
                </select>
              </div>

              <div>
                <label className="form-label">Nível de Treino</label>
                <select
                  value={templateFormData.trainingLevel}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, trainingLevel: e.target.value })}
                  className="form-select"
                >
                  <option value="">Selecione...</option>
                  <option value="beginner">Iniciante</option>
                  <option value="intermediate">Intermediário</option>
                  <option value="advanced">Avançado</option>
                  <option value="athlete">Atleta</option>
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Duração Padrão (semanas)</label>
              <input
                type="number"
                min="1"
                value={templateFormData.defaultDurationWeeks}
                onChange={(e) => setTemplateFormData({
                  ...templateFormData,
                  defaultDurationWeeks: parseInt(e.target.value, 10) || 1,
                })}
                className="form-input"
                required
              />
            </div>

            <div className="form-section">
              <div className="form-section-header">
                <h3 className="form-section-title">Adicionar Modelos de Treino</h3>
                {templateFormData.trainings.length > 0 && (
                  <button
                    type="button"
                    className="btn-primary schedule-template-add-btn"
                    onClick={() => openTrainingTemplateModal()}
                    aria-label="Criar novo modelo de treino"
                  >
                    + Criar novo modelo de treino
                  </button>
                )}
              </div>

              {templateFormData.trainings.length === 0 && (
                <div className="training-actions-empty">
                  <button
                    type="button"
                    className="training-action-card"
                    onClick={handleAddExistingTraining}
                  >
                    <span className="training-action-card-title">Selecionar existente</span>
                    <span className="training-action-card-description">
                      Escolha um modelo de treino já cadastrado.
                    </span>
                  </button>
                  <button
                    type="button"
                    className="training-action-card training-action-card--primary"
                    onClick={() => openTrainingTemplateModal()}
                    aria-label="Criar novo modelo de treino"
                  >
                    <span className="training-action-card-title">Criar novo modelo de treino</span>
                    <span className="training-action-card-description">
                      Cadastre um novo modelo sem sair desta tela.
                    </span>
                  </button>
                </div>
              )}

              {templateFormData.trainings.length > 0 && (
                <>
                  <div className="schedule-template-list">
                    {templateFormData.trainings.map((training, index) => {
                      const invalidDay = training.weekDay
                        && !templateFormData.availableWeekDays.includes(training.weekDay);
                      return (
                        <div key={index} className="schedule-template-row">
                          <div className="schedule-template-fields">
                            <select
                              value={training.trainingTemplateId}
                              onChange={(e) => {
                                const updated = [...templateFormData.trainings];
                                updated[index] = { ...updated[index], trainingTemplateId: e.target.value };
                                setTemplateFormData({ ...templateFormData, trainings: updated });
                              }}
                              className="form-select"
                              required
                            >
                              <option value="">Modelo de treino...</option>
                              {trainingTemplates.map((trainingTemplate) => (
                                <option key={trainingTemplate.id} value={trainingTemplate.id}>
                                  {trainingTemplate.name}
                                </option>
                              ))}
                            </select>

                            <div>
                              <select
                                value={training.weekDay}
                                onChange={(e) => {
                                  const updated = [...templateFormData.trainings];
                                  updated[index] = { ...updated[index], weekDay: e.target.value };
                                  setTemplateFormData({ ...templateFormData, trainings: updated });
                                }}
                                className={`form-select${invalidDay ? ' form-select--error' : ''}`}
                                required
                              >
                                <option value="">Dia da semana...</option>
                                {weekDayOptions.map((day) => (
                                  <option
                                    key={day.value}
                                    value={day.value}
                                    disabled={!templateFormData.availableWeekDays.includes(day.value)}
                                  >
                                    {day.label}
                                    {!templateFormData.availableWeekDays.includes(day.value)
                                      ? ' (indisponível)'
                                      : ''}
                                  </option>
                                ))}
                              </select>
                              {invalidDay && (
                                <span className="schedule-template-error">
                                  Este dia não está nos dias disponíveis do modelo.
                                </span>
                              )}
                            </div>

                            <input
                              type="number"
                              min="1"
                              value={training.order}
                              onChange={(e) => {
                                const updated = [...templateFormData.trainings];
                                updated[index] = { ...updated[index], order: parseInt(e.target.value, 10) || 1 };
                                setTemplateFormData({ ...templateFormData, trainings: updated });
                              }}
                              className="form-input schedule-template-order"
                              placeholder="Ordem"
                              required
                            />
                          </div>

                          <button
                            type="button"
                            className="btn-delete-sm"
                            onClick={() => {
                              const updated = templateFormData.trainings.filter((_, currentIndex) => currentIndex !== index);
                              setTemplateFormData({ ...templateFormData, trainings: updated });
                            }}
                            aria-label="Remover treino"
                          >
                            Remover
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="schedule-template-actions">
                    <button
                      type="button"
                      className="btn-secondary schedule-template-add-btn"
                      onClick={handleAddExistingTraining}
                    >
                      + Adicionar treino
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="btn-group">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
              <button type="button" onClick={resetTemplateForm} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {!showForm && !templatesLoading && (
        <div className="grid-cards">
          {templates.map((template) => (
            <div key={template.id} className="card">
              <div className="mb-md">
                <h3 className="card-subtitle mb-xs">
                  {template.name}
                </h3>
                {template.description && (
                  <p className="card-description mb-md text-clamp-2">
                    {template.description}
                  </p>
                )}
              </div>

              <div className="info-list mb-md" style={{ paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--color-outline-variant)' }}>
                <div className="text-sm text-light">
                  <strong>Duração:</strong> {template.defaultDurationWeeks} semanas
                </div>
                <div className="text-sm text-light">
                  <strong>Treinos:</strong> {template.scheduleTemplatesCount || 0}
                </div>
                {template.availableWeekDays && template.availableWeekDays.length > 0 && (
                  <div className="text-sm text-light">
                    <strong>Dias:</strong> {template.availableWeekDays.map((day) =>
                      weekdayAbbreviations[day] || day
                    ).join(', ')}
                  </div>
                )}
                {template.genderOrdination && (
                  <div className="text-sm text-light">
                    <strong>Classificação:</strong> {{
                      male: 'Masculino',
                      female: 'Feminino',
                      other: 'Outro',
                    }[template.genderOrdination] || template.genderOrdination}
                  </div>
                )}
                {template.trainingLevel && (
                  <div className="text-sm text-light">
                    <strong>Nível:</strong> {{
                      beginner: 'Iniciante',
                      intermediate: 'Intermediário',
                      advanced: 'Avançado',
                      athlete: 'Atleta',
                    }[template.trainingLevel] || template.trainingLevel}
                  </div>
                )}
              </div>

              <div className="btn-group">
                <button onClick={() => handleTemplateEdit(template)} className="btn-edit">
                  Editar
                </button>
                <button onClick={() => handleTemplateDelete(template.id)} className="btn-delete">
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {templates.length === 0 && !showForm && !templatesLoading && (
        <div className="empty-state">
          <p className="empty-state-title">Nenhum modelo de rotina ainda</p>
          <p>Crie seu primeiro modelo e use-o como base ao atribuir rotinas aos alunos</p>
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

      {showTrainingTemplateModal && (
        <div className="overlay" onClick={closeTrainingTemplateModal}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h2 className="bottom-sheet-title">Criar Modelo de Treino</h2>
              <button
                className="bottom-sheet-close"
                onClick={closeTrainingTemplateModal}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <div className="bottom-sheet-body">
              <form onSubmit={handleTrainingTemplateCreate} className="form">
                <div>
                  <label className="form-label" htmlFor="tt-modal-name">Nome</label>
                  <input
                    id="tt-modal-name"
                    type="text"
                    value={trainingTemplateFormData.name}
                    onChange={(e) => setTrainingTemplateFormData({ ...trainingTemplateFormData, name: e.target.value })}
                    className="form-input"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="tt-modal-description">Descrição</label>
                  <textarea
                    id="tt-modal-description"
                    value={trainingTemplateFormData.description}
                    onChange={(e) => setTrainingTemplateFormData({ ...trainingTemplateFormData, description: e.target.value })}
                    rows={3}
                    className="form-textarea"
                  />
                </div>

                <div className="grid-responsive-2col">
                  <div>
                    <label className="form-label" htmlFor="tt-modal-category">Categoria</label>
                    <select
                      id="tt-modal-category"
                      value={trainingTemplateFormData.category}
                      onChange={(e) => setTrainingTemplateFormData({ ...trainingTemplateFormData, category: e.target.value })}
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
                    <label className="form-label" htmlFor="tt-modal-bodySegment">Segmento Corporal</label>
                    <select
                      id="tt-modal-bodySegment"
                      value={trainingTemplateFormData.bodySegment}
                      onChange={(e) => setTrainingTemplateFormData({ ...trainingTemplateFormData, bodySegment: e.target.value })}
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

                <div className="form-checkbox-row">
                  <input
                    type="checkbox"
                    id="trainingTemplateIsPublic"
                    checked={trainingTemplateFormData.isPublic}
                    onChange={(e) => setTrainingTemplateFormData({ ...trainingTemplateFormData, isPublic: e.target.checked })}
                  />
                  <label htmlFor="trainingTemplateIsPublic" className="form-label mb-0">
                    Tornar este modelo público
                  </label>
                </div>

                <div className="btn-group">
                  <button type="submit" disabled={savingTrainingTemplate} className="btn-primary">
                    {savingTrainingTemplate ? 'Salvando...' : 'Criar Modelo de Treino'}
                  </button>
                  <button type="button" onClick={closeTrainingTemplateModal} className="btn-secondary">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProtocolTemplates;
