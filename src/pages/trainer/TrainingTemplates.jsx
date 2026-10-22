import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Plus } from 'lucide-react';
import Select from '../../components/Select';
import RowMenu from '../../components/RowMenu';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import LibraryPageHeader from '../../components/LibraryPageHeader';
import LibraryListView from '../../components/LibraryListView';
import { LibraryListRow } from '../../components/LibraryList';
import LibraryFilterBar from '../../components/LibraryFilterBar';
import { useAuth } from '../../contexts/AuthContext';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import useLibraryList from '../../hooks/useLibraryList';
import { TRAINING_CATEGORY_OPTIONS, TRAINING_CATEGORY_LABEL } from '../../constants/trainingCategories';
import { BODY_SEGMENT_OPTIONS, BODY_SEGMENT_LABEL } from '../../constants/bodySegments';

/** @deprecated Use RowMenu from '../../components/RowMenu' instead */
export const TemplateRowMenu = RowMenu;

const CATEGORY_LABEL = TRAINING_CATEGORY_LABEL;

const ENDPOINT = '/trainer/training-templates';
const NEW_PATH = '/trainer/training-templates/new';
const ALL_FILTER = 'all';

// Public templates belong to the shared library: only admins may delete them.
const canDeleteTemplate = (template, isAdmin) => isAdmin || !template.isPublic;

const CATEGORY_FILTERS = [
  { value: ALL_FILTER, label: 'Todos' },
  ...TRAINING_CATEGORY_OPTIONS,
];

const TrainingTemplates = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const [category, setCategory] = useState('');
  const [bodySegment, setBodySegment] = useState('');

  const isSelectable = (template) => canDeleteTemplate(template, isAdmin);

  const list = useLibraryList({
    endpoint: ENDPOINT,
    filters: { category, bodySegment },
    requestConfirm,
    isSelectable,
  });

  const handleCreate = () => navigate(NEW_PATH);
  const handleOpen = (template) => navigate(`${ENDPOINT}/${template.id}`);

  const handleDelete = (template) => {
    list.deleteOne({
      id: template.id,
      message: `Excluir "${template.name}"? Esta ação não pode ser desfeita.`,
      successMessage: 'Treino único excluído com sucesso!',
    });
  };

  const hasActiveFilters = !!list.q || !!category || !!bodySegment;
  const isEmptyLibrary = list.total === 0 && !hasActiveFilters;
  const canCreate = list.status === 'ready' && !isEmptyLibrary;

  const bodySegmentSelect = (
    <Select
      value={bodySegment}
      onChange={(e) => setBodySegment(e.target.value)}
      aria-label="Filtrar por segmento"
    >
      <option value="">Todos os segmentos</option>
      {BODY_SEGMENT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </Select>
  );

  const toolbar = (
    <LibraryFilterBar
      searchValue={list.searchInput}
      onSearchChange={list.setSearchInput}
      searchPlaceholder="Buscar treino por nome…"
      searchAriaLabel="Buscar treinos"
      filtersAriaLabel="Filtrar treinos por categoria"
      filters={CATEGORY_FILTERS}
      filterCounts={{ [category || ALL_FILTER]: list.total }}
      activeFilter={category || ALL_FILTER}
      onFilterChange={(value) => setCategory(value === ALL_FILTER ? '' : value)}
      sortSelect={bodySegmentSelect}
    />
  );

  const buildBadges = (template) => [
    CATEGORY_LABEL[template.category] && { label: CATEGORY_LABEL[template.category], tone: 'brand' },
    BODY_SEGMENT_LABEL[template.bodySegment] && { label: BODY_SEGMENT_LABEL[template.bodySegment], tone: 'neutral' },
    template.isPublic && { label: 'Público', tone: 'success' },
  ].filter(Boolean);

  return (
    <div>
      <LibraryPageHeader
        icon={Dumbbell}
        title="Treinos únicos"
        actions={canCreate && (
          <button type="button" className="btn btn--primary btn--lg" onClick={handleCreate}>
            <Plus size={20} strokeWidth={2} aria-hidden="true" />
            Novo treino único
          </button>
        )}
      />

      <LibraryListView
        status={list.status}
        loadError={list.loadError}
        errorTitle="Não foi possível carregar os treinos únicos"
        onRetry={list.reload}
        isEmptyLibrary={isEmptyLibrary}
        empty={{
          icon: Dumbbell,
          title: 'Sem treinos únicos ainda',
          description: 'Um treino único é uma ficha pré-configurada com categoria e segmento corporal, reutilizável em diferentes rotinas. Crie o primeiro e use-o como base ao montar os treinos dos seus alunos.',
          actionLabel: 'Criar primeiro treino único',
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
        noResultsMessage="Nenhum treino único corresponde aos filtros atuais."
        footer={{
          shown: list.items.length,
          total: list.total,
          noun: 'treino único',
          nounPlural: 'treinos únicos',
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
            ariaLabel={`Abrir treino único ${template.name}`}
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

export default TrainingTemplates;
