import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Calendar, Dumbbell, Plus } from 'lucide-react';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import LibraryPageHeader from '../../components/LibraryPageHeader';
import LibraryListView from '../../components/LibraryListView';
import { LibraryListRow } from '../../components/LibraryList';
import LibraryFilterBar from '../../components/LibraryFilterBar';
import Select from '../../components/Select';
import { useToast } from '../../contexts/ToastContext';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import useLibraryList from '../../hooks/useLibraryList';
import { PROTOCOL_TYPE_OPTIONS, getProtocolTypeLabel } from '../../constants/protocolTypes';
import { TRAINING_LEVEL_OPTIONS, getLevelLabel } from '../../constants/trainingLevels';
import { getRoutineDraft, clearRoutineDraft, cleanupDraftResources } from '../../utils/routineDraft';
import formatRelativeTime from '../../utils/relativeTime';

const ENDPOINT = '/trainer/protocol-templates';
const NEW_ROUTINE_PATH = '/trainer/routines/new';
const ALL_FILTER = 'all';

const TYPE_FILTERS = [
  { value: ALL_FILTER, label: 'Todos' },
  ...PROTOCOL_TYPE_OPTIONS,
];

const countLabel = (count) => `${count} ${count === 1 ? 'treino' : 'treinos'}`;

const isReady = (template) => (template.scheduleTemplatesCount ?? template.trainingsCount ?? 0) > 0;

const hasDraftContent = (draft) =>
  !!draft &&
  (!!draft.data.name?.trim() ||
    !!draft.data.trainingIds?.length ||
    !!(draft.data.meta && Object.values(draft.data.meta).some((v) => v != null && v !== '')));

const buildTemplateBadges = (template) => {
  const levelLabel = template.trainingLevel ? getLevelLabel(template.trainingLevel) : null;
  const typeLabel = template.type ? getProtocolTypeLabel(template.type) : null;
  return [
    typeLabel && typeLabel !== '-' && { label: typeLabel, tone: 'brand' },
    levelLabel && levelLabel !== '-' && { label: levelLabel, tone: 'neutral' },
    isReady(template) ? { label: 'Pronta', tone: 'success' } : { label: 'Rascunho', tone: 'warning' },
  ].filter(Boolean);
};

const buildTemplateStats = (template) => {
  const trainingsCount = template.scheduleTemplatesCount ?? template.trainingsCount ?? 0;
  return [
    template.defaultDurationWeeks && { icon: Calendar, label: `${template.defaultDurationWeeks} semanas` },
    { icon: Dumbbell, label: countLabel(trainingsCount) },
  ].filter(Boolean);
};

const ProtocolTemplates = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const [draft, setDraft] = useState(() => getRoutineDraft());
  const [type, setType] = useState('');
  const [trainingLevel, setTrainingLevel] = useState('');

  const list = useLibraryList({
    endpoint: ENDPOINT,
    filters: { type, trainingLevel },
    requestConfirm,
  });

  const visibleDraft = hasDraftContent(draft) ? draft : null;
  const hasActiveFilters = !!list.q || !!type || !!trainingLevel;
  // The local draft is client-only: it cannot be paginated/filtered server-side,
  // so it only shows with no active filters.
  const showDraftRow = !!visibleDraft && !hasActiveFilters;
  const isEmptyLibrary = list.total === 0 && !visibleDraft && !hasActiveFilters;
  const canCreate = list.status === 'ready' && !isEmptyLibrary;

  const goToNew = () => navigate(NEW_ROUTINE_PATH);

  const handleDiscardDraft = () => {
    requestConfirm({
      message: 'Descartar este rascunho? Os treinos e exercícios criados aqui também serão apagados.',
      confirmLabel: 'Descartar',
      busyLabel: 'Descartando…',
      onConfirm: async () => {
        try {
          const result = await cleanupDraftResources(draft);
          if (result.failureCount > 0) {
            showToast(`Rascunho descartado, mas ${result.failureCount} item(ns) não puderam ser apagados.`, 'warning');
          } else {
            showToast('Rascunho descartado.', 'success');
          }
        } catch {
          showToast('Erro ao descartar rascunho.', 'error');
        } finally {
          clearRoutineDraft();
          setDraft(null);
        }
      },
    });
  };

  const trainingLevelSelect = (
    <Select
      value={trainingLevel}
      onChange={(e) => setTrainingLevel(e.target.value)}
      aria-label="Filtrar por nível"
    >
      <option value="">Todos os níveis</option>
      {TRAINING_LEVEL_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </Select>
  );

  const toolbar = (
    <LibraryFilterBar
      searchValue={list.searchInput}
      onSearchChange={list.setSearchInput}
      searchPlaceholder="Buscar rotina por nome ou tipo…"
      searchAriaLabel="Buscar rotina"
      filtersAriaLabel="Filtrar rotinas por tipo"
      filters={TYPE_FILTERS}
      filterCounts={{ [type || ALL_FILTER]: list.total }}
      activeFilter={type || ALL_FILTER}
      onFilterChange={(value) => setType(value === ALL_FILTER ? '' : value)}
      sortSelect={trainingLevelSelect}
    />
  );

  const draftRow = showDraftRow && (
    <LibraryListRow
      key="local-draft"
      title={visibleDraft.data.name?.trim() || 'Sem nome'}
      subtitle={`Rascunho salvo ${formatRelativeTime(visibleDraft.savedAt)}`}
      badges={[{ label: 'Em andamento', tone: 'warning' }]}
      stats={[{ icon: Dumbbell, label: countLabel(visibleDraft.data.trainingIds?.length ?? 0) }]}
      onOpen={goToNew}
      ariaLabel="Continuar rascunho em andamento"
      rowMenuProps={{
        ariaLabel: 'Ações do rascunho',
        onDelete: handleDiscardDraft,
        deleteLabel: 'Descartar',
        extraItems: [{ label: 'Continuar editando', onClick: goToNew, danger: false }],
      }}
    />
  );

  return (
    <div>
      <LibraryPageHeader
        icon={ClipboardList}
        title="Rotinas"
        actions={canCreate && (
          <button type="button" className="btn btn--primary btn--lg" onClick={goToNew}>
            <Plus size={20} strokeWidth={2} aria-hidden="true" />
            Nova rotina
          </button>
        )}
      />

      <LibraryListView
        status={list.status}
        loadError={list.loadError}
        errorTitle="Não foi possível carregar as rotinas"
        onRetry={list.reload}
        isEmptyLibrary={isEmptyLibrary}
        empty={{
          icon: ClipboardList,
          title: 'Sem rotinas ainda',
          description: 'Comece pelo treino, não pelo dia: crie o Treino A, B, C… O dia da semana é opcional e você atribui depois.',
          actionLabel: 'Criar primeira rotina',
          onAction: goToNew,
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
        noResultsMessage="Nenhuma rotina corresponde aos filtros atuais."
        footer={{
          shown: list.items.length,
          total: list.total,
          noun: 'rotina',
          nounPlural: 'rotinas',
          loading: list.loadingMore,
          onShowMore: list.loadMore,
        }}
      >
        {draftRow}
        {list.items.map((template) => (
          <LibraryListRow
            key={template.id}
            title={template.name}
            badges={buildTemplateBadges(template)}
            stats={buildTemplateStats(template)}
            selectable
            selected={list.selectedIds.includes(template.id)}
            onToggleSelect={() => list.toggleSelect(template.id)}
            selectAriaLabel={`Selecionar ${template.name}`}
            onOpen={() => navigate(`/trainer/routines/${template.id}`)}
            ariaLabel={`Abrir rotina ${template.name}`}
            rowMenuProps={{
              ariaLabel: `Ações da rotina ${template.name}`,
              onEdit: () => navigate(`/trainer/routines/${template.id}/edit`),
              onDelete: () => list.deleteOne({
                id: template.id,
                message: `Excluir "${template.name}"? Esta ação não pode ser desfeita.`,
                successMessage: 'Rotina excluída.',
              }),
            }}
          />
        ))}
      </LibraryListView>

      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  );
};

export default ProtocolTemplates;
