import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import LibraryList, { LibraryListRow } from '../../components/LibraryList';
import LibraryFilterBar from '../../components/LibraryFilterBar';

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

const TrainerAnamneses = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [anamneses, setAnamneses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingAnamnesis, setEditingAnamnesis] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(FILTER_ALL);

  const fetchAnamneses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/trainer/anamneses');
      setAnamneses(response.data);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

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
      setFormData({ title: '', description: '' });
      navigate(`/trainer/anamneses/${response.data.id}`);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
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
      showToast(error.userMessage || translateError(error), 'error');
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
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const handleCopy = async (anamnesis) => {
    try {
      const response = await api.post(`/trainer/anamneses/${anamnesis.id}/copy`);
      showToast('Anamnese copiada com sucesso!', 'success');
      navigate(`/trainer/anamneses/${response.data.id}`);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    }
  };

  const handleFork = async (anamnesis) => {
    try {
      const response = await api.post(`/trainer/anamneses/${anamnesis.id}/fork`);
      showToast('Nova versão criada com sucesso!', 'success');
      navigate(`/trainer/anamneses/${response.data.id}`);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    }
  };

  const resetForm = () => {
    setFormData({ title: '', description: '' });
    setEditingAnamnesis(null);
    setShowForm(false);
  };

  const handleFormChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const buildRowMenuItems = (anamnesis) => {
    const items = [];
    if (anamnesis.isGeneral) {
      items.push({ label: 'Duplicar', onClick: () => handleCopy(anamnesis) });
    } else {
      items.push({ label: 'Editar', onClick: () => handleEditClick(anamnesis) });
      items.push({ label: 'Duplicar', onClick: () => handleCopy(anamnesis) });
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

  const filterCounts = {
    [FILTER_ALL]: anamneses.length,
    [FILTER_MINE]: anamneses.filter((a) => !a.isGeneral).length,
    [FILTER_GENERAL]: anamneses.filter((a) => a.isGeneral).length,
  };

  const isNoResults = hasItems && filteredAnamneses.length === 0;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title-row">
          <ClipboardList size={24} strokeWidth={2} className="page-header-title-icon" />
          <h1>Anamneses</h1>
        </div>
        {!showForm && hasItems && (
          <div className="page-header-actions">
            <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
              <Plus size={16} strokeWidth={2} aria-hidden="true" />
              Nova anamnese
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="card card--mb">
          <h2 className="card-title mb-md">
            {editingAnamnesis ? 'Editar anamnese' : 'Nova anamnese'}
          </h2>
          <form onSubmit={editingAnamnesis ? handleUpdate : handleCreate} className="form">
            <div className="form-group">
              <label className="form-label" htmlFor="anamnesis-name">
                Nome <span aria-hidden="true" className="form-required">*</span>
              </label>
              <input
                id="anamnesis-name"
                type="text"
                value={formData.title}
                onChange={handleFormChange('title')}
                className="form-input"
                placeholder="Ex: Anamnese inicial"
                required
                disabled={saving}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="anamnesis-description">
                Descrição
              </label>
              <textarea
                id="anamnesis-description"
                value={formData.description}
                onChange={handleFormChange('description')}
                className="form-textarea"
                rows={3}
                placeholder="Descrição opcional"
                disabled={saving}
              />
            </div>
            <p className="text-sm text-muted">
              Após salvar, você poderá adicionar seções e perguntas à anamnese.
            </p>
            <div className="btn-group">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary" disabled={saving}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {!showForm && !hasItems && (
        <div className="empty-state">
          <div className="empty-state-icon empty-state-icon--accent">
            <ClipboardList size={32} strokeWidth={2} />
          </div>
          <p className="empty-state-title">Sem anamneses ainda</p>
          <p className="text-muted text-sm">Crie o primeiro template para aplicar aos alunos.</p>
          <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Criar primeira anamnese
          </button>
        </div>
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

      {confirmDialog && (
        <div className="overlay" onClick={() => setConfirmDialog(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="btn-group">
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="btn-danger"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="btn-secondary"
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

export default TrainerAnamneses;
