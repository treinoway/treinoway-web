import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Search } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import RowMenu from '../../components/RowMenu';

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

const getOrigin = (anamnesis) => {
  if (anamnesis.isGeneral) return { label: 'GERAL', cls: 'badge badge-accent' };
  if (anamnesis.parentId) return { label: 'DERIVADA', cls: 'badge badge-neutral' };
  return { label: 'MINHA', cls: 'badge badge-primary' };
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

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title-row">
          <ClipboardList size={24} strokeWidth={2} className="page-header-title-icon" />
          <h1>Anamneses</h1>
        </div>
        {!showForm && hasItems && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + NOVA ANAMNESE
          </button>
        )}
      </div>

      {showForm && (
        <div className="card card--mb">
          <h2 className="card-title mb-md">
            {editingAnamnesis ? 'Editar anamnese' : 'Nova anamnese'}
          </h2>
          <form onSubmit={editingAnamnesis ? handleUpdate : handleCreate} className="form">
            <div>
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
            <div>
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
            <ClipboardList size={32} strokeWidth={1.2} />
          </div>
          <p className="empty-state-title">Nenhuma anamnese ainda</p>
          <p>Crie seu primeiro template para aplicar aos alunos.</p>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            + Criar primeira anamnese
          </button>
        </div>
      )}

      {!showForm && hasItems && (
        <>
          <div className="toolbar">
            <div className="search-input-wrap">
              <Search size={14} strokeWidth={2} />
              <input
                type="text"
                placeholder="Buscar anamnese..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Buscar anamnese"
              />
            </div>
            <div className="anamnese-filter-chips">
              <button
                className={`anamnese-filter-chip${activeFilter === FILTER_ALL ? ' anamnese-filter-chip--active' : ''}`}
                onClick={() => setActiveFilter(FILTER_ALL)}
              >
                Todos
              </button>
              <button
                className={`anamnese-filter-chip${activeFilter === FILTER_MINE ? ' anamnese-filter-chip--active' : ''}`}
                onClick={() => setActiveFilter(FILTER_MINE)}
              >
                Meus
              </button>
              <button
                className={`anamnese-filter-chip${activeFilter === FILTER_GENERAL ? ' anamnese-filter-chip--active' : ''}`}
                onClick={() => setActiveFilter(FILTER_GENERAL)}
              >
                Gerais
              </button>
            </div>
          </div>

          <div className="rich-list">
            <div className="rich-row-header">
              <span className="eyebrow rich-col-main">Template</span>
              <span className="eyebrow rich-col-origin">Origem</span>
              <span className="eyebrow rich-col-version">Versão</span>
              <span className="rich-col-menu" />
            </div>

            {filteredAnamneses.length === 0 && (
              <div className="rich-row rich-row--empty">
                <span className="eyebrow">Nenhuma anamnese encontrada</span>
              </div>
            )}

            {filteredAnamneses.map((anamnesis) => {
              const origin = getOrigin(anamnesis);
              const dateLabel = formatDate(anamnesis.updatedAt || anamnesis.createdAt);
              const extraItems = buildRowMenuItems(anamnesis);

              return (
                <div
                  key={anamnesis.id}
                  className="rich-row"
                  onClick={() => navigate(`/trainer/anamneses/${anamnesis.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/trainer/anamneses/${anamnesis.id}`);
                    }
                  }}
                  aria-label={`Abrir ${anamnesis.title}`}
                >
                  <div className="rich-row-main">
                    <div className="rich-row-title">{anamnesis.title}</div>
                    <span className="eyebrow">
                      V{anamnesis.version} · Atualizada {dateLabel}
                    </span>
                  </div>

                  <span className={origin.cls}>{origin.label}</span>
                  <span className="badge badge-neutral">v{anamnesis.version}</span>

                  <RowMenu
                    ariaLabel={`Opções de ${anamnesis.title}`}
                    extraItems={extraItems}
                    onDelete={() => handleDelete(anamnesis)}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}

      {confirmDialog && (
        <div className="overlay" onClick={() => setConfirmDialog(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="btn-group">
              <button
                onClick={confirmDialog.onConfirm}
                className="btn-danger"
                style={{ flex: 1 }}
              >
                Confirmar
              </button>
              <button
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

export default TrainerAnamneses;
