import { useNavigate } from 'react-router-dom';
import { Zap, Plus } from 'lucide-react';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import LibraryPageHeader from '../../components/LibraryPageHeader';
import LibraryListView from '../../components/LibraryListView';
import { LibraryListRow } from '../../components/LibraryList';
import LibraryFilterBar from '../../components/LibraryFilterBar';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import useLibraryList from '../../hooks/useLibraryList';
import { getYoutubeVideoId } from '../../utils/youtube';
import { shouldShowGif } from '../../utils/gif';

const ENDPOINT = '/trainer/advanced-techniques';
const NEW_PATH = '/trainer/advanced-techniques/new';

// Badges of a row: "Público" for system techniques plus the media it carries.
const buildBadges = (technique) =>
  [
    technique.isSystem && { label: 'Público', tone: 'success' },
    !!getYoutubeVideoId(technique.videoUrl) && { label: 'Vídeo', tone: 'neutral' },
    shouldShowGif(technique) && { label: 'GIF', tone: 'neutral' },
  ].filter(Boolean);

// Biblioteca > Técnicas avançadas: system (read-only) + own techniques.
const AdvancedTechniques = () => {
  const navigate = useNavigate();
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const list = useLibraryList({ endpoint: ENDPOINT, requestConfirm });

  const handleCreate = () => navigate(NEW_PATH);
  const handleOpen = (technique) => navigate(`${ENDPOINT}/${technique.id}`);

  const handleDelete = (technique) => {
    list.deleteOne({
      id: technique.id,
      message: `Excluir "${technique.name}"? Exercícios que já usam esta técnica continuam exibindo-a. Esta ação não pode ser desfeita.`,
      successMessage: 'Técnica excluída com sucesso!',
    });
  };

  const hasActiveFilters = !!list.q;
  const hasOwnTechniques = list.items.some((technique) => !technique.isSystem);
  const showOwnHint = list.status === 'ready' && !hasActiveFilters && !hasOwnTechniques;
  const canCreate = list.status === 'ready';

  const toolbar = (
    <LibraryFilterBar
      searchValue={list.searchInput}
      onSearchChange={list.setSearchInput}
      searchPlaceholder="Buscar técnica por nome…"
      searchAriaLabel="Buscar técnicas"
      searchInputType="search"
    />
  );

  return (
    <div>
      <LibraryPageHeader
        icon={Zap}
        title="Técnicas avançadas"
        actions={canCreate && (
          <button type="button" className="btn btn--primary btn--lg" onClick={handleCreate}>
            <Plus size={20} strokeWidth={2} aria-hidden="true" />
            Nova técnica
          </button>
        )}
      />

      <LibraryListView
        status={list.status}
        loadError={list.loadError}
        errorTitle="Não foi possível carregar as técnicas"
        onRetry={list.reload}
        toolbar={toolbar}
        refetching={list.refetching}
        isNoResults={hasActiveFilters}
        noResultsMessage="Nenhuma técnica corresponde à busca."
        footer={{
          shown: list.items.length,
          total: list.total,
          noun: 'técnica',
          nounPlural: 'técnicas',
          loading: list.loadingMore,
          onShowMore: list.loadMore,
        }}
      >
        {list.items.map((technique) => (
          <LibraryListRow
            key={technique.id}
            title={technique.name}
            subtitle={technique.description}
            badges={buildBadges(technique)}
            onOpen={() => handleOpen(technique)}
            ariaLabel={`Abrir técnica ${technique.name}`}
            rowMenuProps={technique.isSystem ? undefined : {
              ariaLabel: `Ações da técnica ${technique.name}`,
              onEdit: () => handleOpen(technique),
              onDelete: () => handleDelete(technique),
            }}
          />
        ))}
      </LibraryListView>

      {showOwnHint && (
        <div className="library-own-hint">
          <p className="library-own-hint__text">Você ainda não criou técnicas próprias.</p>
          <button type="button" className="btn btn--secondary" onClick={handleCreate}>
            <Plus size={20} strokeWidth={2} aria-hidden="true" />
            Nova técnica
          </button>
        </div>
      )}

      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  );
};

export default AdvancedTechniques;
