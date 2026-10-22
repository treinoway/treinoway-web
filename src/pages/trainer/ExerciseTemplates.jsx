import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Plus } from 'lucide-react';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import LibraryPageHeader from '../../components/LibraryPageHeader';
import LibraryListView from '../../components/LibraryListView';
import { LibraryListRow } from '../../components/LibraryList';
import LibraryFilterBar from '../../components/LibraryFilterBar';
import { useAuth } from '../../contexts/AuthContext';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import useLibraryList from '../../hooks/useLibraryList';
import { EXERCISE_TYPE_OPTIONS, getExerciseTypeLabel } from '../../constants/exerciseTypes';
import { getYoutubeVideoId } from '../../utils/youtube';

const ENDPOINT = '/trainer/exercise-templates';
const NEW_PATH = '/trainer/exercise-templates/new';
const ALL_FILTER = 'all';

// Public templates belong to the shared library: only admins may delete them.
const canDeleteTemplate = (template, isAdmin) => isAdmin || !template.isPublic;

const TYPE_FILTERS = [
  { value: ALL_FILTER, label: 'Todos' },
  ...EXERCISE_TYPE_OPTIONS,
];

const buildBadges = (template) => {
  const typeLabel = template.type ? getExerciseTypeLabel(template.type) : null;
  return [
    typeLabel && { label: typeLabel, tone: 'brand' },
    template.isPublic && { label: 'Público', tone: 'success' },
    getYoutubeVideoId(template.videoUrl) && { label: 'Vídeo', tone: 'neutral' },
  ].filter(Boolean);
};

const ExerciseTemplates = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const [type, setType] = useState('');

  const isSelectable = (template) => canDeleteTemplate(template, isAdmin);

  const list = useLibraryList({ endpoint: ENDPOINT, filters: { type }, requestConfirm, isSelectable });

  const handleCreate = () => navigate(NEW_PATH);
  const handleOpen = (template) => navigate(`${ENDPOINT}/${template.id}`);

  const handleDelete = (template) => {
    list.deleteOne({
      id: template.id,
      message: `Excluir "${template.name}"? Esta ação não pode ser desfeita.`,
      successMessage: 'Exercício excluído com sucesso!',
    });
  };

  const hasActiveFilters = !!list.q || !!type;
  const isEmptyLibrary = list.total === 0 && !hasActiveFilters;
  const canCreate = list.status === 'ready' && !isEmptyLibrary;

  const toolbar = (
    <LibraryFilterBar
      searchValue={list.searchInput}
      onSearchChange={list.setSearchInput}
      searchPlaceholder="Buscar exercício por nome…"
      searchAriaLabel="Buscar exercícios"
      filtersAriaLabel="Filtrar exercícios por tipo"
      filters={TYPE_FILTERS}
      filterCounts={{ [type || ALL_FILTER]: list.total }}
      activeFilter={type || ALL_FILTER}
      onFilterChange={(value) => setType(value === ALL_FILTER ? '' : value)}
    />
  );

  return (
    <div>
      <LibraryPageHeader
        icon={Activity}
        title="Exercícios"
        actions={canCreate && (
          <button type="button" className="btn btn--primary btn--lg" onClick={handleCreate}>
            <Plus size={20} strokeWidth={2} aria-hidden="true" />
            Novo exercício
          </button>
        )}
      />

      <LibraryListView
        status={list.status}
        loadError={list.loadError}
        errorTitle="Não foi possível carregar os exercícios"
        onRetry={list.reload}
        isEmptyLibrary={isEmptyLibrary}
        empty={{
          icon: Activity,
          title: 'Sem exercícios ainda',
          description: 'Um exercício é um movimento reutilizável que você adiciona aos seus treinos, com séries, repetições, carga sugerida e vídeo. Crie o primeiro para facilitar a montagem das rotinas.',
          actionLabel: 'Criar primeiro exercício',
          onAction: handleCreate,
        }}
        toolbar={toolbar}
        refetching={list.refetching}
        batch={list.items.length > 0 ? {
          allSelected: list.allSelected,
          selectedCount: list.selectedIds.length,
          onToggleSelectAll: list.toggleSelectAll,
          onDelete: list.deleteSelected,
        } : null}
        isNoResults={hasActiveFilters}
        noResultsMessage="Nenhum exercício corresponde aos filtros atuais."
        footer={{
          shown: list.items.length,
          total: list.total,
          noun: 'exercício',
          nounPlural: 'exercícios',
          loading: list.loadingMore,
          onShowMore: list.loadMore,
        }}
      >
        {list.items.map((template) => (
          <LibraryListRow
            key={template.id}
            title={template.name}
            badges={buildBadges(template)}
            selectable
            selectDisabled={!canDeleteTemplate(template, isAdmin)}
            selected={list.selectedIds.includes(template.id)}
            onToggleSelect={() => list.toggleSelect(template.id)}
            selectAriaLabel={`Selecionar ${template.name}`}
            onOpen={() => handleOpen(template)}
            ariaLabel={`Abrir exercício ${template.name}`}
            rowMenuProps={canDeleteTemplate(template, isAdmin) ? {
              ariaLabel: `Ações do modelo ${template.name}`,
              onEdit: () => handleOpen(template),
              onDelete: () => handleDelete(template),
            } : undefined}
          />
        ))}
      </LibraryListView>

      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  );
};

export default ExerciseTemplates;
