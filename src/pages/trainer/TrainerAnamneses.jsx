import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus } from 'lucide-react';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import AnamnesisFormModal from '../../components/anamnesis/AnamnesisFormModal';
import LibraryPageHeader from '../../components/LibraryPageHeader';
import LibraryListView from '../../components/LibraryListView';
import { LibraryListRow } from '../../components/LibraryList';
import LibraryFilterBar from '../../components/LibraryFilterBar';
import { useToast } from '../../contexts/ToastContext';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import { translateError } from '../../i18n';
import api from '../../api/axios';

const FILTER_ALL = 'all';
const FILTER_MINE = 'mine';
const FILTER_GENERAL = 'general';

const FILTERS = [
  { value: FILTER_ALL, label: 'Todos' },
  { value: FILTER_MINE, label: 'Meus' },
  { value: FILTER_GENERAL, label: 'Gerais' },
];

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
  if (anamnesis.isGeneral) return { label: 'Geral', tone: 'warning' };
  if (anamnesis.parentId) return { label: 'Derivada', tone: 'neutral' };
  return { label: 'Minha', tone: 'brand' };
};

const matchesFilter = (anamnesis, filter) =>
  filter === FILTER_ALL ||
  (filter === FILTER_MINE && !anamnesis.isGeneral) ||
  (filter === FILTER_GENERAL && anamnesis.isGeneral);

const getErrorMessage = (error) => error.userMessage || translateError(error);

const TrainerAnamneses = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { dialogProps, requestConfirm } = useConfirmDialog();

  const [anamneses, setAnamneses] = useState([]);
  const [status, setStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [formState, setFormState] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(FILTER_ALL);
  const [selectedIds, setSelectedIds] = useState([]);

  const fetchAnamneses = useCallback(async () => {
    try {
      const response = await api.get('/trainer/anamneses');
      setAnamneses(response.data);
      setStatus('ready');
    } catch (error) {
      setLoadError(getErrorMessage(error));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    fetchAnamneses();
  }, [fetchAnamneses]);

  const handleRetry = () => {
    setStatus('loading');
    fetchAnamneses();
  };

  const filteredAnamneses = anamneses.filter(
    (a) => a.title.toLowerCase().includes(searchQuery.toLowerCase()) && matchesFilter(a, activeFilter),
  );

  const deletableIds = filteredAnamneses.filter((a) => !a.isGeneral).map((a) => a.id);
  const allSelected = deletableIds.length > 0 && deletableIds.every((id) => selectedIds.includes(id));

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setSelectedIds([]);
  };

  const handleFilterChange = (value) => {
    setActiveFilter(value);
    setSelectedIds([]);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmitForm = async (values) => {
    const editing = formState?.anamnesis;
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/trainer/anamneses/${editing.id}`, values);
        showToast('Anamnese atualizada com sucesso!', 'success');
        setFormState(null);
        fetchAnamneses();
      } else {
        const response = await api.post('/trainer/anamneses', values);
        showToast('Anamnese criada com sucesso!', 'success');
        navigate(`/trainer/anamneses/${response.data.id}`);
      }
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (anamnesis) => {
    requestConfirm({
      message: `Excluir "${anamnesis.title}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      onConfirm: async () => {
        await api.delete(`/trainer/anamneses/${anamnesis.id}`);
        showToast('Anamnese excluída com sucesso!', 'success');
        await fetchAnamneses();
      },
    });
  };

  const handleDeleteSelected = () => {
    const ids = selectedIds;
    requestConfirm({
      message: `Excluir ${ids.length} ${ids.length === 1 ? 'anamnese selecionada' : 'anamneses selecionadas'}? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      onConfirm: async () => {
        const results = await Promise.allSettled(ids.map((id) => api.delete(`/trainer/anamneses/${id}`)));
        const failed = results.filter((r) => r.status === 'rejected').length;
        const deleted = ids.length - failed;
        if (failed === 0) {
          showToast(`${deleted} ${deleted === 1 ? 'anamnese excluída' : 'anamneses excluídas'}.`, 'success');
        } else {
          showToast(`${deleted} excluída(s), ${failed} não puderam ser excluídas (verifique se estão em uso).`, 'warning');
        }
        setSelectedIds([]);
        await fetchAnamneses();
      },
    });
  };

  const handleCopy = async (anamnesis) => {
    try {
      const response = await api.post(`/trainer/anamneses/${anamnesis.id}/copy`);
      showToast('Anamnese copiada com sucesso!', 'success');
      navigate(`/trainer/anamneses/${response.data.id}`);
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    }
  };

  const handleFork = async (anamnesis) => {
    try {
      const response = await api.post(`/trainer/anamneses/${anamnesis.id}/fork`);
      showToast('Nova versão criada com sucesso!', 'success');
      navigate(`/trainer/anamneses/${response.data.id}`);
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    }
  };

  const handleAssign = (anamnesis) => navigate(`/trainer/anamneses/${anamnesis.id}/assign`, {
    state: { from: '/trainer/anamneses' },
  });

  const buildRowMenuProps = (anamnesis) => {
    const extraItems = [
      { label: 'Enviar para alunos', onClick: () => handleAssign(anamnesis) },
      { label: 'Duplicar', onClick: () => handleCopy(anamnesis) },
    ];
    if (anamnesis.isGeneral) return { ariaLabel: `Opções de ${anamnesis.title}`, extraItems };
    extraItems.push({ label: 'Nova versão', onClick: () => handleFork(anamnesis) });
    return {
      ariaLabel: `Opções de ${anamnesis.title}`,
      onEdit: () => setFormState({ anamnesis }),
      extraItems,
      onDelete: () => handleDelete(anamnesis),
    };
  };

  const openCreateForm = () => setFormState({ anamnesis: null });
  const isEmptyLibrary = anamneses.length === 0;
  const canCreate = status === 'ready' && !isEmptyLibrary;

  const filterCounts = Object.fromEntries(
    FILTERS.map(({ value }) => [value, anamneses.filter((a) => matchesFilter(a, value)).length]),
  );

  const toolbar = (
    <LibraryFilterBar
      searchValue={searchQuery}
      onSearchChange={handleSearchChange}
      searchPlaceholder="Buscar anamnese…"
      searchAriaLabel="Buscar anamnese"
      filtersAriaLabel="Filtrar anamneses"
      filters={FILTERS}
      activeFilter={activeFilter}
      onFilterChange={handleFilterChange}
      filterCounts={filterCounts}
    />
  );

  return (
    <div>
      <LibraryPageHeader
        icon={FileText}
        title="Anamneses"
        actions={canCreate && (
          <button type="button" className="btn btn--primary btn--lg" onClick={openCreateForm}>
            <Plus size={20} strokeWidth={2} aria-hidden="true" />
            Nova anamnese
          </button>
        )}
      />

      <LibraryListView
        status={status}
        loadError={loadError}
        errorTitle="Não foi possível carregar as anamneses"
        onRetry={handleRetry}
        isEmptyLibrary={isEmptyLibrary}
        empty={{
          icon: FileText,
          title: 'Sem anamneses ainda',
          description: 'Crie o primeiro modelo de anamnese para aplicar aos seus alunos. Depois de salvar, você poderá adicionar seções e perguntas.',
          actionLabel: 'Criar primeira anamnese',
          onAction: openCreateForm,
        }}
        toolbar={toolbar}
        batch={deletableIds.length > 0 ? {
          allSelected,
          selectedCount: selectedIds.length,
          onToggleSelectAll: () => setSelectedIds(allSelected ? [] : deletableIds),
          onDelete: handleDeleteSelected,
        } : null}
        isNoResults
        noResultsMessage="Nenhuma anamnese corresponde aos filtros atuais."
      >
        {filteredAnamneses.map((anamnesis) => (
          <LibraryListRow
            key={anamnesis.id}
            title={anamnesis.title}
            subtitle={`Atualizada em ${formatDate(anamnesis.updatedAt || anamnesis.createdAt)}`}
            badges={[getOriginBadge(anamnesis), { label: `v${anamnesis.version}`, tone: 'neutral' }]}
            selectable
            selectDisabled={anamnesis.isGeneral}
            selected={selectedIds.includes(anamnesis.id)}
            onToggleSelect={() => toggleSelect(anamnesis.id)}
            selectAriaLabel={anamnesis.isGeneral
              ? `${anamnesis.title} (anamnese geral, não pode ser excluída)`
              : `Selecionar ${anamnesis.title}`}
            onOpen={() => navigate(`/trainer/anamneses/${anamnesis.id}`)}
            ariaLabel={`Abrir ${anamnesis.title}`}
            rowMenuProps={buildRowMenuProps(anamnesis)}
          />
        ))}
      </LibraryListView>

      {formState && (
        <AnamnesisFormModal
          anamnesis={formState.anamnesis}
          saving={saving}
          onClose={() => setFormState(null)}
          onSubmit={handleSubmitForm}
        />
      )}
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  );
};

export default TrainerAnamneses;
