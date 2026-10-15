import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ClipboardList, Plus, X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import LibraryList, { LibraryListRow } from '../../components/LibraryList';
import LibraryFilterBar from '../../components/LibraryFilterBar';
import AnamnesisPreviewModal from '../../components/AnamnesisPreviewModal';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import EmptyBlock from '../../components/ds/EmptyBlock';
import Segmented from '../../components/ds/Segmented';
import TemplateGallery from '../../components/anamnesis/TemplateGallery';
import SaveAsTemplateDialog from '../../components/anamnesis/SaveAsTemplateDialog';

const formatDate = (iso) => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
};

const getOriginBadge = (anamnesis) => {
  if (anamnesis.isGeneral) return <span className="badge badge-accent">GERAL</span>;
  if (anamnesis.parentId) return <span className="badge badge-neutral">DERIVADA</span>;
  return <span className="badge badge-primary">MINHA</span>;
};

const FILTER_ALL = 'all';
const FILTER_MINE = 'mine';
const FILTER_GENERAL = 'general';

const CREATE_FROM_SCRATCH = 'scratch';
const CREATE_FROM_TEMPLATE = 'template';
const CREATE_PANEL_BODY_ID = 'anamnesis-create-panel-body';
const createTabId = (mode) => `anamnesis-create-tab-${mode}`;
const CREATE_MODE_ITEMS = [
  { id: CREATE_FROM_SCRATCH, label: 'Criar do zero' },
  { id: CREATE_FROM_TEMPLATE, label: 'Usar um modelo' },
].map((item) => ({ ...item, domId: createTabId(item.id), controls: CREATE_PANEL_BODY_ID }));

const EMPTY_FORM = { title: '', description: '' };

const AnamnesisForm = ({ formData, saving, onChange, onSubmit, onCancel }) => (
  <form onSubmit={onSubmit} className="anamnesis-form">
    <div className="field">
      <label className="field-label type-caption-strong" htmlFor="anamnesis-name">
        Nome <span aria-hidden="true">*</span>
      </label>
      <input
        id="anamnesis-name"
        type="text"
        value={formData.title}
        onChange={onChange('title')}
        className="input"
        placeholder="Ex: Anamnese inicial"
        required
        disabled={saving}
        autoFocus
      />
    </div>
    <div className="field">
      <label className="field-label type-caption-strong" htmlFor="anamnesis-description">
        Descrição
      </label>
      <textarea
        id="anamnesis-description"
        value={formData.description}
        onChange={onChange('description')}
        className="input"
        rows={3}
        placeholder="Descrição opcional"
        disabled={saving}
      />
    </div>
    <p className="anamnesis-form__hint type-caption">
      Após salvar, você poderá adicionar seções e perguntas à anamnese.
    </p>
    <div className="ds-actions">
      <button type="submit" disabled={saving} className="btn btn--primary">
        {saving ? 'Carregando...' : 'Salvar'}
      </button>
      <button type="button" onClick={onCancel} className="btn btn--secondary" disabled={saving}>
        Cancelar
      </button>
    </div>
  </form>
);

AnamnesisForm.propTypes = {
  formData: PropTypes.shape({ title: PropTypes.string, description: PropTypes.string }).isRequired,
  saving: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

const TrainerAnamneses = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [anamneses, setAnamneses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [createMode, setCreateMode] = useState(CREATE_FROM_SCRATCH);
  const [saving, setSaving] = useState(false);
  const [editingAnamnesis, setEditingAnamnesis] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(FILTER_ALL);
  const [copyingId, setCopyingId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saveAsTarget, setSaveAsTarget] = useState(null);
  const [savingAs, setSavingAs] = useState(false);
  const previewRequestRef = useRef(null);

  const showError = useCallback(
    (error) => showToast(error.userMessage || translateError(error), 'error'),
    [showToast],
  );

  const fetchAnamneses = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await api.get('/trainer/anamneses');
      setAnamneses(response.data);
    } catch (error) {
      setLoadError(true);
      showError(error);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchAnamneses();
  }, [fetchAnamneses]);

  const filteredAnamneses = anamneses.filter((a) => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      activeFilter === FILTER_ALL ||
      (activeFilter === FILTER_MINE && !a.isGeneral) ||
      (activeFilter === FILTER_GENERAL && a.isGeneral);
    return matchesSearch && matchesFilter;
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await api.post('/trainer/anamneses', formData);
      showToast('Anamnese criada com sucesso!', 'success');
      setShowForm(false);
      setFormData(EMPTY_FORM);
      navigate(`/trainer/anamneses/${response.data.id}`);
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/trainer/anamneses/${editingAnamnesis.id}`, formData);
      showToast('Anamnese atualizada com sucesso!', 'success');
      fetchAnamneses();
      resetForm();
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (anamnesis) => {
    setEditingAnamnesis(anamnesis);
    setFormData({ title: anamnesis.title, description: anamnesis.description || '' });
    setShowForm(true);
  };

  const handleDelete = (anamnesis) => {
    setConfirmDialog({
      message: `Excluir "${anamnesis.title}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/anamneses/${anamnesis.id}`);
          showToast('Anamnese excluída com sucesso!', 'success');
          fetchAnamneses();
        } catch (error) {
          showError(error);
        }
      },
    });
  };

  const handleUseTemplate = async (template) => {
    if (copyingId) return;
    setCopyingId(template.id);
    try {
      const response = await api.post(`/trainer/anamneses/${template.id}/copy`);
      showToast('Anamnese criada a partir do modelo.', 'success');
      navigate(`/trainer/anamneses/${response.data.id}`);
    } catch (error) {
      showError(error);
      setCopyingId(null);
    }
  };

  const closePreview = () => {
    previewRequestRef.current = null;
    setPreview(null);
  };

  const handleClosePreview = () => {
    if (!copyingId) closePreview();
  };

  const handlePreviewTemplate = async (template) => {
    previewRequestRef.current = template.id;
    setPreview({ template, detail: null });
    try {
      const response = await api.get(`/trainer/anamneses/${template.id}`);
      if (previewRequestRef.current === template.id) setPreview({ template, detail: response.data });
    } catch (error) {
      if (previewRequestRef.current !== template.id) return;
      showError(error);
      closePreview();
    }
  };

  const handleCancelSaveAs = () => setSaveAsTarget(null);

  const handleSaveAsSubmit = async (title) => {
    setSavingAs(true);
    try {
      await api.post(`/trainer/anamneses/${saveAsTarget.id}/copy`, { title });
      showToast(`Modelo "${title}" salvo.`, 'success');
      setSaveAsTarget(null);
      fetchAnamneses();
    } catch (error) {
      showError(error);
    } finally {
      setSavingAs(false);
    }
  };

  const handleFork = async (anamnesis) => {
    try {
      const response = await api.post(`/trainer/anamneses/${anamnesis.id}/fork`);
      showToast('Nova versão criada com sucesso!', 'success');
      navigate(`/trainer/anamneses/${response.data.id}`);
    } catch (error) {
      showError(error);
    }
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingAnamnesis(null);
    setShowForm(false);
  };

  const openCreatePanel = () => {
    setFormData(EMPTY_FORM);
    setEditingAnamnesis(null);
    setCreateMode(CREATE_FROM_SCRATCH);
    setShowForm(true);
  };

  const handleFormChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const buildRowMenuItems = (anamnesis) => {
    const items = [];
    const saveAsItem = { label: 'Salvar como modelo', onClick: () => setSaveAsTarget(anamnesis) };
    if (anamnesis.isGeneral) {
      items.push(saveAsItem);
    } else {
      items.push({ label: 'Editar', onClick: () => handleEditClick(anamnesis) });
      items.push(saveAsItem);
      items.push({ label: 'Nova versão', onClick: () => handleFork(anamnesis) });
    }
    return items;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando...</span>
      </div>
    );
  }

  const hasItems = anamneses.length > 0;
  const templates = anamneses.filter((a) => a.isGeneral);
  const isCreating = !editingAnamnesis;
  const showGallery = isCreating && createMode === CREATE_FROM_TEMPLATE;
  const panelTitle = isCreating ? 'Nova anamnese' : 'Editar anamnese';

  const filterCounts = {
    [FILTER_ALL]: anamneses.length,
    [FILTER_MINE]: anamneses.filter((a) => !a.isGeneral).length,
    [FILTER_GENERAL]: anamneses.filter((a) => a.isGeneral).length,
  };

  const isNoResults = hasItems && filteredAnamneses.length === 0;

  const panelBody = showGallery ? (
    <TemplateGallery
      templates={templates}
      error={loadError}
      copyingId={copyingId}
      onRetry={fetchAnamneses}
      onPreview={handlePreviewTemplate}
      onUse={handleUseTemplate}
      onCreateFromScratch={() => setCreateMode(CREATE_FROM_SCRATCH)}
    />
  ) : (
    <AnamnesisForm
      formData={formData}
      saving={saving}
      onChange={handleFormChange}
      onSubmit={editingAnamnesis ? handleUpdate : handleCreate}
      onCancel={resetForm}
    />
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title-row">
          <ClipboardList size={24} strokeWidth={2} className="page-header-title-icon" />
          <h1>Anamneses</h1>
        </div>
        {!showForm && hasItems && (
          <div className="page-header-actions">
            <button type="button" onClick={openCreatePanel} className="btn btn--primary">
              <Plus size={16} strokeWidth={2} aria-hidden="true" />
              Nova anamnese
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <section className="section-card anamnesis-create-panel" aria-labelledby="anamnesis-panel-title">
          <div className="anamnesis-create-panel__header">
            <h2 id="anamnesis-panel-title" className="anamnesis-create-panel__title type-h3">{panelTitle}</h2>
            <button
              type="button"
              className="icon-button"
              aria-label="Fechar"
              title="Fechar"
              onClick={resetForm}
              disabled={saving || Boolean(copyingId)}
            >
              <X size={20} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
          {isCreating && (
            <Segmented
              ariaLabel="Como criar a anamnese"
              items={CREATE_MODE_ITEMS}
              value={createMode}
              onChange={setCreateMode}
              disabled={saving || Boolean(copyingId)}
            />
          )}
          <div
            id={CREATE_PANEL_BODY_ID}
            role={isCreating ? 'tabpanel' : undefined}
            aria-labelledby={isCreating ? createTabId(createMode) : undefined}
          >
            {panelBody}
          </div>
        </section>
      )}

      {!showForm && !hasItems && (
        <EmptyBlock
          icon={ClipboardList}
          title="Sem anamneses ainda"
          description="Crie a primeira anamnese do zero ou a partir de um modelo."
          actionLabel="Criar primeira anamnese"
          onAction={openCreatePanel}
        />
      )}

      {!showForm && hasItems && (
        <>
          <LibraryFilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Buscar anamnese…"
            searchAriaLabel="Buscar anamnese"
            filters={[
              { value: FILTER_ALL, label: 'Todos' },
              { value: FILTER_MINE, label: 'Meus' },
              { value: FILTER_GENERAL, label: 'Gerais' },
            ]}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            filterCounts={filterCounts}
          />

          <LibraryList
            emptyMessage={`Nenhuma anamnese encontrada para "${searchQuery}"`}
            isNoResults={isNoResults}
          >
            {filteredAnamneses.map((anamnesis) => {
              const dateLabel = formatDate(anamnesis.updatedAt || anamnesis.createdAt);
              const subtitle = `v${anamnesis.version} · atualizada ${dateLabel}`;
              const extraItems = buildRowMenuItems(anamnesis);

              const badges = (
                <>
                  {getOriginBadge(anamnesis)}
                  <span className="badge badge-neutral">v{anamnesis.version}</span>
                </>
              );

              return (
                <LibraryListRow
                  key={anamnesis.id}
                  title={anamnesis.title}
                  subtitle={subtitle}
                  badges={badges}
                  onClick={() => navigate(`/trainer/anamneses/${anamnesis.id}`)}
                  ariaLabel={`Abrir ${anamnesis.title}`}
                  rowMenuProps={{
                    ariaLabel: `Opções de ${anamnesis.title}`,
                    extraItems,
                    onDelete: () => handleDelete(anamnesis),
                  }}
                />
              );
            })}
          </LibraryList>
        </>
      )}

      {preview && (
        <AnamnesisPreviewModal
          anamnesis={preview.detail ?? preview.template}
          open
          readOnly
          loading={!preview.detail}
          using={copyingId === preview.template.id}
          onClose={handleClosePreview}
          onUse={() => handleUseTemplate(preview.template)}
        />
      )}

      {saveAsTarget && (
        <SaveAsTemplateDialog
          anamnesisTitle={saveAsTarget.title}
          saving={savingAs}
          onSubmit={handleSaveAsSubmit}
          onCancel={handleCancelSaveAs}
        />
      )}

      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
};

export default TrainerAnamneses;
