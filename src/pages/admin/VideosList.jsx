import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Film, Image as ImageIcon, Plus } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import Select from '../../components/Select';
import RowMenu from '../../components/RowMenu';
import { TRAINING_CATEGORY_OPTIONS, TRAINING_CATEGORY_LABEL } from '../../constants/trainingCategories';
import { BODY_SEGMENT_OPTIONS, BODY_SEGMENT_LABEL } from '../../constants/bodySegments';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

const buildQueryString = ({ search, category, bodySegment, tag, page }) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category) params.append('category', category);
  if (bodySegment) params.append('bodySegment', bodySegment);
  if (tag) params.append('tag', tag);
  params.append('page', String(page));
  params.append('pageSize', String(PAGE_SIZE));
  return params.toString();
};

const VideosList = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [videos, setVideos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [bodySegment, setBodySegment] = useState('');
  const [tag, setTag] = useState('');

  const [confirmDialog, setConfirmDialog] = useState(null);
  const debounceRef = useRef(null);

  // Debounce the search input → committed `search` value
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  // Reset to first page whenever a non-search filter changes
  useEffect(() => {
    setPage(1);
  }, [category, bodySegment, tag]);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const query = buildQueryString({ search, category, bodySegment, tag, page });
      const response = await api.get(`/admin/videos?${query}`);
      setVideos(response.data?.items || []);
      setTotal(response.data?.total || 0);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [search, category, bodySegment, tag, page, showToast]);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  const handleDelete = (video) => {
    setConfirmDialog({
      message: `Excluir "${video.title}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/admin/videos/${video.id}`);
          showToast('Vídeo excluído com sucesso!', 'success');
          fetchVideos();
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = !!(search || category || bodySegment || tag);
  const showEmptyAll = !loading && videos.length === 0 && !hasFilters;
  const showEmptyFiltered = !loading && videos.length === 0 && hasFilters;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title-row">
          <Film size={24} className="page-header-title-icon" strokeWidth={2} />
          <h1>Biblioteca de vídeos</h1>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate('/admin/videos/new')}
          >
            <Plus size={16} strokeWidth={2} /> Novo vídeo
          </button>
        </div>
      </div>

      <div className="video-filter-bar">
        <div>
          <label className="form-label" htmlFor="videos-search">Buscar</label>
          <input
            id="videos-search"
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="form-input"
            placeholder="Buscar por título..."
          />
        </div>
        <div>
          <label className="form-label" htmlFor="videos-category">Categoria</label>
          <Select
            id="videos-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">Todas</option>
            {TRAINING_CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="form-label" htmlFor="videos-bodySegment">Segmento</label>
          <Select
            id="videos-bodySegment"
            value={bodySegment}
            onChange={(event) => setBodySegment(event.target.value)}
          >
            <option value="">Todos</option>
            {BODY_SEGMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="form-label" htmlFor="videos-tag">Tag</label>
          <input
            id="videos-tag"
            type="text"
            value={tag}
            onChange={(event) => setTag(event.target.value)}
            className="form-input"
            placeholder="Ex: iniciante"
          />
        </div>
      </div>

      {loading && (
        <div className="loading-screen">
          <span className="loading-text">Carregando...</span>
        </div>
      )}

      {!loading && videos.length > 0 && (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Miniatura</th>
                  <th>Título</th>
                  <th className="table-col-desktop-only">Categoria</th>
                  <th className="table-col-desktop-only">Segmento</th>
                  <th className="table-col-desktop-only">Tags</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {videos.map((video) => {
                  const categoryLabel = video.categoryLabel || TRAINING_CATEGORY_LABEL[video.category] || '-';
                  const segmentLabel = video.bodySegmentLabel
                    || (video.bodySegment ? BODY_SEGMENT_LABEL[video.bodySegment] : null)
                    || '-';
                  return (
                    <tr key={video.id}>
                      <td>
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl}
                            alt={`Miniatura de ${video.title}`}
                            className="video-thumb"
                          />
                        ) : (
                          <span className="video-thumb-placeholder" aria-label="Sem miniatura">
                            <ImageIcon size={16} strokeWidth={2} />
                          </span>
                        )}
                      </td>
                      <td>
                        <Link to={`/admin/videos/${video.id}`} className="font-medium">
                          {video.title}
                        </Link>
                      </td>
                      <td className="table-col-desktop-only">{categoryLabel}</td>
                      <td className="table-col-desktop-only">{segmentLabel}</td>
                      <td className="table-col-desktop-only">
                        {Array.isArray(video.tags) && video.tags.length > 0 ? (
                          <div className="video-tag-list">
                            {video.tags.map((t) => (
                              <span key={t} className="badge badge-gray">{t}</span>
                            ))}
                          </div>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                      <td>
                        <RowMenu
                          ariaLabel={`Ações do vídeo ${video.title}`}
                          onEdit={() => navigate(`/admin/videos/${video.id}`)}
                          onDelete={() => handleDelete(video)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="video-pagination">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
              >
                Anterior
              </button>
              <span className="video-pagination__status">
                Página {page} de {pageCount}
              </span>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                disabled={page === pageCount}
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      {showEmptyFiltered && (
        <div className="empty-state">
          <p className="empty-state-title">Nenhum vídeo encontrado para os filtros aplicados.</p>
        </div>
      )}

      {showEmptyAll && (
        <div className="empty-state">
          <div className="empty-state-icon empty-state-icon--accent">
            <Film size={32} strokeWidth={1.2} />
          </div>
          <p className="empty-state-title">Nenhum vídeo cadastrado</p>
          <p>Adicione o primeiro vídeo da biblioteca pública.</p>
          <button className="btn-primary" onClick={() => navigate('/admin/videos/new')}>
            + Cadastrar vídeo
          </button>
        </div>
      )}

      {confirmDialog && (
        <div className="overlay">
          <div className="confirm-dialog">
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="btn-group btn-group--equal">
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="btn-danger btn-flex-1"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="btn-secondary btn-flex-1"
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

export default VideosList;
