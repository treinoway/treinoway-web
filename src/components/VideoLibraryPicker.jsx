import { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { Image as ImageIcon, X } from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import Select from './Select';
import { TRAINING_CATEGORY_OPTIONS, TRAINING_CATEGORY_LABEL } from '../constants/trainingCategories';
import { BODY_SEGMENT_OPTIONS, BODY_SEGMENT_LABEL } from '../constants/bodySegments';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

const buildQueryString = ({ search, category, bodySegment, page }) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category) params.append('category', category);
  if (bodySegment) params.append('bodySegment', bodySegment);
  params.append('page', String(page));
  params.append('pageSize', String(PAGE_SIZE));
  return params.toString();
};

const getCategoryLabel = (video) =>
  video.categoryLabel || TRAINING_CATEGORY_LABEL[video.category] || '';

const getSegmentLabel = (video) =>
  video.bodySegmentLabel
  || (video.bodySegment ? BODY_SEGMENT_LABEL[video.bodySegment] : '')
  || '';

/**
 * Modal/sheet for trainers to pick a curated video from the public library.
 * Owns its own filter, fetch, and pagination state. Calls onSelect(video)
 * with the chosen Video and then onClose().
 */
const VideoLibraryPicker = ({
  isOpen,
  onClose,
  onSelect,
  initialSearch = '',
  initialCategory = '',
}) => {
  const { showToast } = useToast();

  const [videos, setVideos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [bodySegment, setBodySegment] = useState('');

  const debounceRef = useRef(null);

  // Reset filters every time the picker (re)opens.
  useEffect(() => {
    if (!isOpen) return;
    setSearchInput(initialSearch);
    setSearch(initialSearch);
    setCategory(initialCategory);
    setBodySegment('');
    setPage(1);
  }, [isOpen, initialSearch, initialCategory]);

  // Debounce text search input.
  useEffect(() => {
    if (!isOpen) return undefined;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput, isOpen]);

  // Reset to first page whenever non-search filters change.
  useEffect(() => {
    setPage(1);
  }, [category, bodySegment]);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const query = buildQueryString({ search, category, bodySegment, page });
      const response = await api.get(`/videos?${query}`);
      setVideos(response.data?.items || []);
      setTotal(response.data?.total || 0);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [search, category, bodySegment, page, showToast]);

  useEffect(() => {
    if (!isOpen) return;
    fetchVideos();
  }, [isOpen, fetchVideos]);

  if (!isOpen) return null;

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const handleSelect = (video) => {
    onSelect(video);
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="bottom-sheet bottom-sheet--large"
        role="dialog"
        aria-modal="true"
        aria-label="Selecionar vídeo da biblioteca"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bottom-sheet-header">
          <h2 className="bottom-sheet-title">Biblioteca de vídeos</h2>
          <button
            type="button"
            className="bottom-sheet-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="bottom-sheet-body">
          <div className="video-filter-bar">
            <div>
              <label className="form-label" htmlFor="vp-search">Buscar</label>
              <input
                id="vp-search"
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="form-input"
                placeholder="Buscar por título..."
              />
            </div>
            <div>
              <label className="form-label" htmlFor="vp-category">Categoria</label>
              <Select
                id="vp-category"
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
              <label className="form-label" htmlFor="vp-segment">Segmento</label>
              <Select
                id="vp-segment"
                value={bodySegment}
                onChange={(event) => setBodySegment(event.target.value)}
              >
                <option value="">Todos</option>
                {BODY_SEGMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>
          </div>

          {loading && (
            <div className="loading-screen">
              <span className="loading-text">Carregando...</span>
            </div>
          )}

          {!loading && videos.length === 0 && (
            <div className="video-picker-empty">
              Nenhum vídeo encontrado.
            </div>
          )}

          {!loading && videos.length > 0 && (
            <div className="video-picker-list">
              {videos.map((video) => {
                const categoryLabel = getCategoryLabel(video);
                const segmentLabel = getSegmentLabel(video);
                return (
                  <button
                    key={video.id}
                    type="button"
                    className="video-picker-row"
                    onClick={() => handleSelect(video)}
                    aria-label={`Selecionar vídeo ${video.title}`}
                  >
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt=""
                        className="video-thumb"
                      />
                    ) : (
                      <span className="video-thumb-placeholder" aria-hidden="true">
                        <ImageIcon size={16} strokeWidth={2} />
                      </span>
                    )}
                    <span className="video-picker-row__body">
                      <span className="video-picker-row__title">{video.title}</span>
                      <span className="video-picker-row__meta">
                        {categoryLabel && <span>{categoryLabel}</span>}
                        {segmentLabel && <span>· {segmentLabel}</span>}
                      </span>
                      {Array.isArray(video.tags) && video.tags.length > 0 && (
                        <span className="video-tag-list">
                          {video.tags.map((t) => (
                            <span key={t} className="badge badge-gray">{t}</span>
                          ))}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {!loading && pageCount > 1 && (
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
        </div>
      </div>
    </div>
  );
};

VideoLibraryPicker.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  initialSearch: PropTypes.string,
  initialCategory: PropTypes.string,
};

export default VideoLibraryPicker;
